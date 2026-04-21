import { Router } from 'express';
import { checkUsername, login, register } from '../controllers/auth.controller';

const router = Router();

router.get('/check-username', checkUsername);
router.post('/register', register);
router.post('/login', login);

export default router;
