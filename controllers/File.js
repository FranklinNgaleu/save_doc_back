import multer from "multer";
import db from "../config/Database.js";
import fs from 'fs';
import Files from "../models/FileModel.js";
import User from "../models/UserModel.js";
import {Op} from "sequelize";


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Le dossier où les fichiers seront stockés temporairement
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});
const upload = multer({ storage: storage }).single('file'); // 'file' est le nom du champ dans le formulaire


export const addFile = async(req, res) =>{
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            const { filename, path } = req.file;
    
            // Utilisez fs pour obtenir la taille du fichier
            const sizeInBytes = fs.statSync(path).size;
            const sizeInMegabytes = sizeInBytes / (1024 * 1024).toFixed(2);
            //const size = fs.statSync(path).size;

            const user = await User.findByPk(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            // Vérifier si l'utilisateur a assez d'espace de stockage
            if (user.storage < parseFloat(sizeInMegabytes)) {
                return res.status(400).json({ error: 'Espace de stockage insuffisant' });
            }

            user.storage -= parseFloat(sizeInMegabytes);
            await user.save();
        
            //console.log(req.userId)
            await Files.create({
                filename: filename,
                path: path,
                size: sizeInMegabytes,
                userId: req.userId
            });
    
            res.status(201).json({ msg:"File added Successfuly" });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du téléchargement du fichier' });
    }
}

export const getAllFile = async(req,res) => {
    try {
        let response;
        if(req.role === "admin"){
            response = await Files.findAll({
                attributes:['uuid','filename','size','createdAt'],
                include:[{
                    model: User,
                    attributes:['name','email']
                }]
            }); 
        }else{
            response = await Files.findAll({
                attributes:['uuid','filename','size','createdAt'],
                where:{
                    userId: req.userId
                },
                include:[{
                    model: User,
                    attributes:['name','email']
                }]
            });
        }
        res.status(200).json(response);
        
    } catch (error) {
        res.status(500).json({msg: error.message});
    }

}

export const getFileByUser = async(req,res) => {
    
}

export const deleteFile = async(req,res) => {
    try {
        const file = await Files.findOne({
            where:{
                uuid: req.params.id
            }
        });
        if(!file) return res.status(404).json({msg: "Données introuvable"});
        const {filename, size} = req.body;
        if(req.role === "admin"){
            await Files.destroy({
                where:{
                    id: file.id
                }
            });
        }else{
            console.log(req.body.userId)
            console.log(file.userId)
            if(req.userId !== file.userId) return res.status(403).json({msg: "Acces interdit"});
            await Files.destroy({
                where:{
                    [Op.and]:[{id: file.id}, {userId: req.userId}]
                }
            });
        }
        res.status(200).json({msg: "File deleted successfuly"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const totalFile = async(req,res) => {
    try {
        const total = await Files.count();
        res.json({ total });
    } catch (error) {
        res.status(500).send(error.message);
    }
}

export const totalFileOfToday = async(req,res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    try {
        const total2 = await Files.count({
            where: {
                createdAt: {
                    [Op.gte]: todayStart,
                    [Op.lte]: todayEnd
            }
        }
        });
        res.json({ total2 });
    } catch (error) {
        res.status(500).send(error.message);
    }
}

export const totalFileByUser = async(req,res) => {
    try {
        const total3 = await Files.findAll({
            attributes: [[db.fn('COUNT', db.col('filename')), 'fileCount']],
            include: [{
                model: User,
                attributes:['name','email'] // Remplacez par les attributs pertinents de l'utilisateur
            }],
          group: ['User.id'], // Groupez par l'identifiant de l'utilisateur
        });
    
        res.json(total3);
    } catch (error) {
        res.status(500).send(error.message);
    }
}