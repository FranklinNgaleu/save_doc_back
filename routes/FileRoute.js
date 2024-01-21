import express from "express";

import {
    addFile,
    getAllFile,
    getFileByUser,
    deleteFile,
    totalFile,
    totalFileOfToday,
    totalFileByUser
} from "../controllers/File.js";
import { verifyUser } from "../middleware/AuthUser.js";
import { adminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.post('/upload', verifyUser,addFile);
router.get('/files',verifyUser,getAllFile);
router.get('/files/all',verifyUser,adminOnly,totalFile);
router.get('/files/user',verifyUser,adminOnly,totalFileByUser);
router.get('/files/today',verifyUser,adminOnly,totalFileOfToday);
router.get('/user/:userId',verifyUser,getFileByUser);
router.delete('/files/:id',verifyUser, deleteFile);

export default router;
