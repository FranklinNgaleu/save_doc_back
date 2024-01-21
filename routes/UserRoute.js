import express from "express";
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    paiement,
} from "../controllers/Users.js";
import { verifyUser, adminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get('/users', verifyUser, adminOnly, getUsers);
router.get('/users/:id',verifyUser,getUserById);
router.post('/users', createUser);
router.patch('/users/:id', verifyUser, adminOnly, updateUser);
router.delete('/users/:id', verifyUser, deleteUser);
router.post('/create-checkout-session',paiement);

export default router;