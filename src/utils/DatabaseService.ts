import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Score entry interface
 */
export interface ScoreEntry {
  id?: number;
  username: string;
  score: number;
  wave: number;
  created_at?: string;
}

/**
 * Database service for connecting to Supabase
 */
export class DatabaseService {
  private supabase: SupabaseClient;
  
  constructor() {
    // Replace with your actual Supabase URL and anon key
    const supabaseUrl = 'https://your-supabase-url.supabase.co';
    const supabaseKey = 'your-supabase-anon-key';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Submit a new score to the leaderboard
   * @param scoreData Score data to submit
   * @returns Promise with the submission result
   */
  async submitScore(scoreData: ScoreEntry): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('leaderboard')
        .insert([scoreData]);
        
      if (error) {
        console.error('Error submitting score:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting score:', error);
      return false;
    }
  }
  
  /**
   * Get the top scores from the leaderboard
   * @param limit Number of scores to retrieve (default 10)
   * @returns Promise with the top scores
   */
  async getTopScores(limit: number = 10): Promise<ScoreEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error('Error fetching top scores:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching top scores:', error);
      return [];
    }
  }
} 