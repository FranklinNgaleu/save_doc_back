import User from "../models/UserModel.js";
import argon2 from "argon2";
import File from "../models/FileModel.js"
import db from "../config/Database.js";
import nodemailer from 'nodemailer';

import Stripe from 'stripe';
//const stripe = Stripe(process.env.STRIPE_SECRET);


export const getUsers = async(req, res) =>{
    try {
        
        const response = await User.findAll({
            attributes:['uuid','name','email','role','storage', [db.fn('SUM', db.col('size')), 'usedStorage']],
            include: [{
                model: File, // Remplacez par votre modèle de fichier
                attributes: []
            }],
            group: ['users.uuid'],
            raw: true
        });
        
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}


export const getUserById = async(req, res) =>{
    try {
        const userId = req.userId;
        const response = await User.findOne({
            where: { id: userId},
                attributes: [
                    'name',
                    'email',
                    'role', 
                    'storage',
                    [db.fn('SUM', db.col('size')), 'usedStorage'],
                    [db.fn('COUNT', db.col('name')), 'fileCount']
                ], // Incluez les attributs nécessaires
                // Ajoutez ici d'autres paramètres de requête si nécessaire
                include: [{
                    model: File, // Remplacez par votre modèle de fichier
                    attributes: []
                }],
                group: ['users.uuid'],
                raw: true
        });
        
        if (!response) {
            return res.status(404).json({ msg: "Utilisateur non trouvé" });
        }
    
        res.json(response);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
}

export const createUser = async(req, res) =>{
    const {name, email, password, confPassword, role} = req.body;
    if(password !== confPassword) return res.status(400).json({msg: "le mot de passe et la confirmation du mot de passe ne correspondent pas"});
    const hashPassword = await argon2.hash(password);
    try {
        await User.create({
            name: name,
            email: email,
            password: hashPassword,
            role: role,
            storage: 20 * 1024 
        });

        // Configuration du transporteur Nodemailer
        let transporter = nodemailer.createTransport({
            service: 'outlook', // ex. 'gmail'
            auth: {
                user: 'f.ngaleu@ecole-ipssi.net',
                pass: 'Tchokodjeu2'
            }
        });

        // Contenu de l'email
        let mailOptions = {
            from: 'f.ngaleu@ecole-ipssi.net',
            to: req.body.email,
            subject: 'Bienvenue sur Notre Plateforme',
            text: 'Votre inscription a été réussie.'
        };

        // Envoi de l'email
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email envoyé: ' + info.response);
            }
        });
        res.status(201).json({msg: "Inscription réussi"});
    } catch (error) {
        res.status(400).json({msg: error.message});
    }
}

export const updateUser = async(req, res) =>{
    const user = await User.findOne({
        where: {
            uuid: req.params.id
        }
    });
    if(!user) return res.status(404).json({msg: "Utilisateur introuvable"});
    const {name, email, password, confPassword, role} = req.body;
    let hashPassword;
    if(password === "" || password === null){
        hashPassword = user.password
    }else{
        hashPassword = await argon2.hash(password);
    }
    if(password !== confPassword) return res.status(400).json({msg: "le mot de passe et la confirmation du mot de passe ne correspondent pas"});
    try {
        await User.update({
            name: name,
            email: email,
            password: hashPassword,
            role: role
        },{
            where:{
                id: user.id
            }
        });
        res.status(200).json({msg: "User Updated"});
    } catch (error) {
        res.status(400).json({msg: error.message});
    }
}


// Fonction pour envoyer un email
async function sendEmail(to, message) {
    const transporter = nodemailer.createTransport({
        service: 'outlook',
        auth: {
            user: 'f.ngaleu@ecole-ipssi.net',
            pass: 'Tchokodjeu2'
        }
    });

    const mailOptions = {
        from: 'f.ngaleu@ecole-ipssi.net',
        to: to,
        subject: 'Notification de Suppression de Compte',
        text: message
    };

    await transporter.sendMail(mailOptions);
}  

export const deleteUser = async(req, res) =>{
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }
    
        // Supprimer tous les fichiers de l'utilisateur
        const files = await File.findAll({ where: { userId: userId } });
        const fileCount = files.length;
        await File.destroy({ where: { userId: userId } });
    
        // Envoyer un email à l'utilisateur
        await sendEmail(user.email, 'Votre compte a été supprimé');
    
        // Envoyer un email à l'administrateur
        const adminEmail = 'franklinngaleu24@gmail.com';
        await sendEmail(adminEmail, `L'utilisateur ${user.name} a supprimé son compte. Nombre de fichiers supprimés : ${fileCount}`);
    
        // Supprimer l'utilisateur de la base de données
        await User.destroy({ where: { id: userId } });
    
    } catch (error) {
        console.error('Erreur lors de la suppression du compte', error);
        // Gérer les erreurs ici
    }
}

//const stripe = require('stripe')(process.env.STRIPE_SECRET)
const stripe = new Stripe('sk_test_51O8JRcHVgqkS5VNxARjKlowzGftNyZuGNkHqTjEGjlr0Vollbj1paTagps8bSaGCUb6AD9vGQ8hG1jUuCpZsFWq100Iy4o5G7I');
export const paiement = async(req, res) => {
    try{
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types:["card"],
            mode:"payment",
            line_items: req.body.items.map(item => {
                return{
                    price_data:{
                        currency:"eur",
                        product_data:{
                            name: item.name
                        },
                        unit_amount: (item.price)*100,

                    },
                    quantity: item.quantity
                }
            }),
            
            success_url: 'http://127.0.0.1:3000/',
            cancel_url: 'http://127.0.0.1:3000/cancel'
        })
        
        res.json({url: session.url})

    }catch(e){
        res.status(500).json({error:e.message})
    }
}
    