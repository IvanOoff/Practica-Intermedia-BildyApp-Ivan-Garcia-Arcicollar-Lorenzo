// CONTROLADOR DEL USUARIO
import User from '../models/User.js';
import Company from '../models/Company.js';
import RefreshToken from '../models/RefreshToken.js';
import { encrypt, compare } from '../utils/handlePassword.js';
import { tokenSign, generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../utils/handleJwt.js';
import { AppError } from '../utils/AppError.js';
import userEvents from '../services/notification.service.js';

const generateValidationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// REGISTRO DE USUARIO
export const registerCtrl = async (req, res, next) => {
  try {
    const { email, password, name, lastName } = req.body;
    const existingUser = await User.findOne({ email, status: 'verified' });
    if (existingUser) {
      throw AppError.conflict('El email ya esta registrado');
    }
    const hashedPassword = await encrypt(password);
    const verificationCode = generateValidationCode();
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      lastName,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verificationAttempts: 3,
      role: 'admin'
    });
    userEvents.emit('user.registered', user);
    console.log(`CODIGO DE VALIDACION PARA ${email}: ${verificationCode}`);
    const accessToken = tokenSign(user);
    const refreshToken = generateRefreshToken();
    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      createdByIp: req.ip
    });
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        email: user.email,
        status: user.status,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// VALIDACION DE EMAIL
export const validateCtrl = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      throw AppError.notFound('Usuario');
    }
    if (user.status === 'verified') {
      throw AppError.badRequest('El usuario ya esta verificado');
    }
    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Codigo de verificacion expirado. Solicita uno nuevo.');
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save();
      throw AppError.badRequest(`Codigo incorrecto. Intentos restantes: ${user.verificationAttempts}`);
    }
    if (user.verificationCodeExpires < new Date()) {
      throw AppError.badRequest('El codigo de validacion ha expirado');
    }
    user.status = 'verified';
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    user.verificationAttempts = 3;
    await user.save();
    userEvents.emit('user.validated', user);
    res.json({ message: 'Email validado correctamente' });
  } catch (err) {
    next(err);
  }
};

// LOGIN DE USUARIO
export const loginCtrl = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw AppError.unauthorized('Credenciales invalidas');
    }
    if (user.deleted) {
      throw AppError.unauthorized('Usuario eliminado');
    }
    const check = await compare(password, user.password);
    if (!check) {
      throw AppError.unauthorized('Credenciales invalidas');
    }
    if (user.status === 'pending') {
      throw AppError.forbidden('Por favor valida tu email primero');
    }
    const accessToken = tokenSign(user);
    const refreshToken = generateRefreshToken();
    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      createdByIp: req.ip
    });
    user.password = undefined;
    res.json({
      accessToken,
      refreshToken,
      user
    });
  } catch (err) {
    next(err);
  }
};

// REFRESH TOKEN
export const refreshCtrl = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw AppError.badRequest('Refresh token requerido');
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('user');
    if (!storedToken || !storedToken.isActive()) {
      throw AppError.unauthorized('Refresh token invalido o expirado');
    }
    const accessToken = generateAccessToken(storedToken.user);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

// LOGOUT DE USUARIO
export const logoutCtrl = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revokedAt: new Date(), revokedByIp: req.ip }
      );
    }
    res.json({ message: 'Sesion cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

// OBTENER USUARIO AUTENTICADO
export const meCtrl = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'company',
      populate: { path: 'owner', select: 'name email' }
    });
    if (!user) {
      throw AppError.notFound('Usuario');
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

// ACTUALIZAR PERFIL (ONBOARDING)
export const updateProfileCtrl = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

// CAMBIAR CONTRASENA
export const changePasswordCtrl = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const check = await compare(currentPassword, user.password);
    if (!check) {
      throw AppError.unauthorized('Contrasena actual incorrecta');
    }
    user.password = await encrypt(newPassword);
    await user.save();
    res.json({ message: 'Contrasena cambiada correctamente' });
  } catch (err) {
    next(err);
  }
};

// ELIMINAR USUARIO (SOFT/HARD DELETE)
export const deleteCtrl = async (req, res, next) => {
  try {
    const soft = req.query.soft !== 'false';
    if (soft) {
      await User.findByIdAndUpdate(
        req.user._id,
        { deleted: true, deletedAt: new Date() }
      );
      userEvents.emit('user.deleted', req.user);
      return res.json({ message: 'Usuario eliminado (soft delete)' });
    }
    await User.findByIdAndDelete(req.user._id);
    await RefreshToken.deleteMany({ user: req.user._id });
    userEvents.emit('user.deleted', req.user);
    res.json({ message: 'Usuario eliminado permanentemente' });
  } catch (err) {
    next(err);
  }
};

// CREAR O UNIRSE A COMPAÑIA
export const createCompanyCtrl = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { isFreelance, name, cif, address } = req.body;
    const user = await User.findById(userId);
    if (user.company) {
      throw AppError.conflict('Ya tienes una empresa asociada');
    }
    const existingOwner = await Company.findOne({ owner: userId });
    if (existingOwner) {
      throw AppError.conflict('Ya eres propietario de una empresa');
    }
    if (isFreelance) {
      const companyData = {
        owner: userId,
        name: name || `${user.name} ${user.lastName}`,
        cif: user.nif,
        address: address || user.address,
        isFreelance: true
      };
      const company = await Company.create(companyData);
      user.company = company._id;
      await user.save();
      return res.status(201).json({ data: company });
    }
    if (!cif) {
      throw AppError.badRequest('El CIF es requerido para empresas no freelance');
    }
    const existingCompany = await Company.findOne({ cif });
    if (existingCompany) {
      user.company = existingCompany._id;
      user.role = 'guest';
      await user.save();
      return res.json({
        message: 'Te has unido a la empresa existente',
        data: existingCompany
      });
    }
    const company = await Company.create({
      owner: userId,
      name,
      cif,
      address,
      isFreelance: false
    });
    user.company = company._id;
    await user.save();
    res.status(201).json({ data: company });
  } catch (err) {
    next(err);
  }
};

// UNIRSE A COMPAÑIA EXISTENTE
export const joinCompanyCtrl = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { companyId } = req.body;
    const user = await User.findById(userId);
    if (user.company) {
      throw AppError.conflict('Ya perteneces a una empresa');
    }
    const company = await Company.findById(companyId);
    if (!company) {
      throw AppError.notFound('Empresa');
    }
    if (company.isFreelance) {
      throw AppError.forbidden('No puedes unirte a una empresa freelance');
    }
    user.company = companyId;
    await user.save();
    res.json({ message: 'Te has unido a la empresa correctamente', data: company });
  } catch (err) {
    next(err);
  }
};

// ACTUALIZAR COMPAÑIA
export const updateCompanyCtrl = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, address } = req.body;
    const user = await User.findById(userId);
    if (!user.company) {
      throw AppError.notFound('No tienes empresa asociada');
    }
    const company = await Company.findOne({
      _id: user.company,
      owner: userId
    });
    if (!company) {
      throw AppError.notFound('Empresa no encontrada o no eres el propietario');
    }
    if (name) company.name = name;
    if (address !== undefined) company.address = address;
    await company.save();
    res.json({ data: company });
  } catch (err) {
    next(err);
  }
};

// SUBIR LOGO DE COMPAÑIA
export const uploadLogoCtrl = async (req, res, next) => {
  try {
    const userId = req.user._id;
    if (!req.file) {
      throw AppError.badRequest('No se ha subido ningun archivo');
    }
    const user = await User.findById(userId);
    if (!user.company) {
      throw AppError.notFound('No tienes empresa asociada');
    }
    const company = await Company.findOne({
      _id: user.company,
      owner: userId
    });
    if (!company) {
      throw AppError.notFound('Empresa no encontrada o no eres el propietario');
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    company.logo = logoUrl;
    await company.save();
    res.json({ message: 'Logo actualizado', data: { logo: logoUrl } });
  } catch (err) {
    next(err);
  }
};

// OBTENER COMPAÑIA
export const getCompanyCtrl = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user.company) {
      throw AppError.notFound('No tienes empresa asociada');
    }
    const company = await Company.findById(user.company)
      .populate('owner', 'name email');
    res.json({ data: company });
  } catch (err) {
    next(err);
  }
};

// INVITAR USUARIO A COMPAÑIA
export const inviteUserCtrl = async (req, res, next) => {
  try {
    const { email, name, lastName, password } = req.body;
    if (req.user.role !== 'admin') {
      throw AppError.forbidden('Solo usuarios admin pueden invitar');
    }
    if (!req.user.company) {
      throw AppError.notFound('No tienes empresa asociada');
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('El usuario ya existe');
    }
    const hashedPassword = await encrypt(password);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name: name || 'Usuario',
      lastName: lastName || 'Invitado',
      company: req.user.company,
      role: 'guest',
      status: 'verified'
    });
    userEvents.emit('user.invited', req.user, email);
    res.status(201).json({ data: newUser });
  } catch (err) {
    next(err);
  }
};
