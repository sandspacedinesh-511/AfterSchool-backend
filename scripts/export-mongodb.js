/**
 * MongoDB Export Script
 * 
 * This script exports lessons and orders collections from MongoDB Atlas
 * Run with: node scripts/export-mongodb.js
 * 
 * Make sure to set MONGODB_URI in your .env file
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function exportCollections() {
    let client;
    
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        
        const db = client.db('afterSchoolClasses');
        
        // Export lessons collection
        const lessons = await db.collection('lessons').find({}).toArray();
        const lessonsPath = path.join(__dirname, '..', '..', 'lessons.json');
        fs.writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2));
        console.log(`Exported ${lessons.length} lessons to ${lessonsPath}`);
        
        // Export orders collection
        const orders = await db.collection('orders').find({}).toArray();
        const ordersPath = path.join(__dirname, '..', '..', 'orders.json');
        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
        console.log(`Exported ${orders.length} orders to ${ordersPath}`);
        
        console.log('Export completed successfully!');
        
    } catch (error) {
        console.error('Export error:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

exportCollections();





