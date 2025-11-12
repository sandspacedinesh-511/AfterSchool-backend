/**
 * Script to add spaces to English Literature lesson
 * Run with: node scripts/add-english-spaces.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function addSpacesToEnglish() {
    let client;
    
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        
        const db = client.db('afterSchoolClasses');
        const lessonsCollection = db.collection('lessons');
        
        // Find English Literature lesson
        const englishLesson = await lessonsCollection.findOne({ subject: 'English Literature' });
        
        if (!englishLesson) {
            console.log('English Literature lesson not found!');
            return;
        }
        
        console.log(`Current spaces for English Literature: ${englishLesson.space}`);
        
        // Update to 8 spaces (original value)
        await lessonsCollection.updateOne(
            { subject: 'English Literature' },
            { $set: { space: 8 } }
        );
        
        console.log('✅ English Literature updated: 0 → 8 spaces');
        
        // Show updated status
        const updated = await lessonsCollection.findOne({ subject: 'English Literature' });
        console.log(`\nUpdated lesson:`);
        console.log(`  Subject: ${updated.subject}`);
        console.log(`  Location: ${updated.location}`);
        console.log(`  Price: £${updated.price}`);
        console.log(`  Spaces: ${updated.space}`);
        
    } catch (error) {
        console.error('Error updating lesson:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

addSpacesToEnglish();

