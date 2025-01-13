import pg from "pg";
const { Pool } = pg;

class Db {
  constructor() {
    this.config = {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    };

    this.pool = new Pool(this.config);
  }

  async initialize() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tweets (
        id BIGINT PRIMARY KEY,
        text TEXT,
        username VARCHAR(255),
        timestamp BIGINT,
        created_at TIMESTAMP,
        is_reply BOOLEAN,
        is_retweet BOOLEAN,
        likes INTEGER,
        retweet_count INTEGER,
        replies INTEGER,
        photos JSON,
        videos JSON,
        urls JSON,
        permanent_url TEXT,
        in_reply_to_status_id BIGINT,
        hashtags JSON,
        created_by VARCHAR(255),
        created_date TIMESTAMP,
        modified_by VARCHAR(255),
        modified_date TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tweets_username ON tweets(username);
      CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  async saveTweets(tweets) {
    if (!Array.isArray(tweets) || tweets.length === 0) {
      throw new Error("Input must be a non-empty array of tweets");
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); // Start transaction

      const insertQuery = `
        INSERT INTO tweets (
          id, text, username, timestamp, created_at, 
          is_reply, is_retweet, likes, retweet_count, replies,
          photos, videos, urls, permanent_url, in_reply_to_status_id, hashtags,
          created_by, created_date, modified_by, modified_date
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $17, $18)
        ON CONFLICT (id) 
        DO UPDATE SET
          text = EXCLUDED.text,
          username = EXCLUDED.username,
          timestamp = EXCLUDED.timestamp,
          created_at = EXCLUDED.created_at,
          is_reply = EXCLUDED.is_reply,
          is_retweet = EXCLUDED.is_retweet,
          likes = EXCLUDED.likes,
          retweet_count = EXCLUDED.retweet_count,
          replies = EXCLUDED.replies,
          photos = EXCLUDED.photos,
          videos = EXCLUDED.videos,
          urls = EXCLUDED.urls,
          permanent_url = EXCLUDED.permanent_url,
          in_reply_to_status_id = EXCLUDED.in_reply_to_status_id,
          hashtags = EXCLUDED.hashtags,
          modified_by = EXCLUDED.created_by,
          modified_date = EXCLUDED.created_date;
      `;

      const currentTimestamp = new Date().toISOString();
      const results = [];

      // Process tweets in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < tweets.length; i += batchSize) {
        const batch = tweets.slice(i, i + batchSize);
        const batchPromises = batch.map((tweet) => {
          const values = [
            tweet.id,
            tweet.text,
            tweet.username,
            tweet.timestamp,
            tweet.createdAt,
            tweet.isReply,
            tweet.isRetweet,
            tweet.likes,
            tweet.retweetCount,
            tweet.replies,
            JSON.stringify(tweet.photos),
            JSON.stringify(tweet.videos),
            JSON.stringify(tweet.urls),
            tweet.permanentUrl,
            tweet.inReplyToStatusId,
            JSON.stringify(tweet.hashtags),
            this.createdBy,
            currentTimestamp,
          ];
          return client.query(insertQuery, values);
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      await client.query("COMMIT"); // Commit transaction

      console.log(`Successfully processed ${results.length} tweets`);
      return {
        success: true,
        processedCount: results.length,
        timestamp: currentTimestamp,
      };
    } catch (error) {
      await client.query("ROLLBACK"); // Rollback transaction on error
      console.error("Error in batch save:", error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database connection:", error);
      throw error;
    }
  }
}

export default Db;