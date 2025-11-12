/**
 * Script to add spaces to lessons that are sold out (space = 0)
 * Run with: node scripts/add-spaces.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function addSpacesToSoldOutLessons() {
    let client;
    
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        
        const db = client.db('afterSchoolClasses');
        const lessonsCollection = db.collection('lessons');
        
        // Find all lessons with 0 spaces
        const soldOutLessons = await lessonsCollection.find({ space: 0 }).toArray();
        console.log(`Found ${soldOutLessons.length} sold out lessons`);
        
        if (soldOutLessons.length === 0) {
            console.log('No sold out lessons found. All lessons have available spaces.');
            return;
        }
        
        // Update each sold out lesson to have 5 spaces
        for (const lesson of soldOutLessons) {
            await lessonsCollection.updateOne(
                { _id: lesson._id },
                { $set: { space: 5 } }
            );
            console.log(`Updated ${lesson.subject}: 0 → 5 spaces`);
        }
        
        console.log('\nAll sold out lessons have been updated with 5 spaces!');
        
        // Show updated status
        const allLessons = await lessonsCollection.find({}).toArray();
        console.log('\nCurrent lesson availability:');
        allLessons.forEach(l => {
            console.log(`  ${l.subject}: ${l.space} spaces`);
        });
        
    } catch (error) {
        console.error('Error updating lessons:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

addSpacesToSoldOutLessons();





