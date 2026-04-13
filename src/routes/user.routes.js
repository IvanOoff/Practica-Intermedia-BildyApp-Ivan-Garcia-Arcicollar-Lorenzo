import { Router } from 'express';
import {
  registerCtrl,
  validateCtrl,
  loginCtrl,
  refreshCtrl,
  logoutCtrl,
  meCtrl,
  updateProfileCtrl,
  changePasswordCtrl,
  deleteCtrl,
  getCompanyCtrl,
  createCompanyCtrl,
  joinCompanyCtrl,
  updateCompanyCtrl,
  uploadLogoCtrl,
  inviteUserCtrl
} from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import authMiddleware from '../middleware/auth.middleware.js';
import uploadMiddleware from '../middleware/upload.js';
import {
  validatorRegister,
  validatorLogin,
  validatorValidate,
  validatorUpdateProfile,
  validatorChangePassword,
  validatorRefresh,
  validatorCreateCompany,
  validatorUpdateCompany,
  validatorInviteUser
} from '../validators/user.validator.js';

const router = Router();

router.post('/register', validate(validatorRegister), registerCtrl);
router.put('/validation', authMiddleware, validate(validatorValidate), validateCtrl);
router.post('/login', validate(validatorLogin), loginCtrl);
router.post('/refresh', validate(validatorRefresh), refreshCtrl);
router.post('/logout', authMiddleware, logoutCtrl);

router.get('/', authMiddleware, meCtrl);
router.put('/register', authMiddleware, validate(validatorUpdateProfile), updateProfileCtrl);
router.put('/password', authMiddleware, validate(validatorChangePassword), changePasswordCtrl);
router.delete('/', authMiddleware, deleteCtrl);

router.patch('/company', authMiddleware, validate(validatorCreateCompany), createCompanyCtrl);
router.patch('/company/join', authMiddleware, joinCompanyCtrl);
router.get('/company', authMiddleware, getCompanyCtrl);
router.put('/company', authMiddleware, validate(validatorUpdateCompany), updateCompanyCtrl);
router.patch('/logo', authMiddleware, uploadMiddleware.single('file'), uploadLogoCtrl);
router.post('/invite', authMiddleware, validate(validatorInviteUser), inviteUserCtrl);

export default router;
