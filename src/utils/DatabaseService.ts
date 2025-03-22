import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
 * Database service for connecting to Supabase with real-time updates
 */
export class DatabaseService {
  private supabase: SupabaseClient;
  private leaderboardSubscription: RealtimeChannel | null = null;
  private leaderboardListeners: ((scores: ScoreEntry[]) => void)[] = [];
  
  constructor() {
    // Your Supabase credentials - replace these with your actual credentials
    const supabaseUrl = 'https://jvjafjlbxvjkjptymfqk.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2amFmamxieHZqa2pwdHltZnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjY5NzksImV4cCI6MjA1ODI0Mjk3OX0.24hgv8Gx1OJSDk5BSnsXWFbtPWBRu9q61FUxYfloxhc';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify Supabase connection at initialization
    this.verifySupabaseConnection();
  }
  
  /**
   * Verify Supabase connection and table existence
   */
  private async verifySupabaseConnection(): Promise<void> {
    try {
      console.log('Verifying Supabase connection...');
      
      // Check database connection by fetching a single row
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('⚠️ Supabase connection error:', error);
        console.error('Please check your Supabase credentials and table configuration.');
        return;
      }
      
      console.log('✅ Supabase connection successful');
      console.log('Leaderboard table exists and is accessible');
    } catch (error) {
      console.error('❌ Failed to verify Supabase connection:', error);
      console.error('Please ensure the Supabase project is properly set up following the README instructions.');
    }
  }
  
  /**
   * Submit a new score to the leaderboard
   * @param scoreData Score data to submit
   * @returns Promise with the submission result
   */
  async submitScore(scoreData: ScoreEntry): Promise<boolean> {
    try {
      console.log('Attempting to submit score:', scoreData);
      
      // First, check if this username already has a score
      const { data: existingScore, error: fetchError } = await this.supabase
        .from('leaderboard')
        .select('score')
        .eq('username', scoreData.username)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error checking for existing score:', fetchError);
        return false;
      }
      
      // If a score exists but the new score is lower, don't update
      if (existingScore && existingScore.score >= scoreData.score) {
        console.log('Existing score is higher, not updating:', existingScore.score, 'vs', scoreData.score);
        // Still return true since this isn't an error
        return true;
      }
      
      // Use upsert to insert or update
      const { error } = await this.supabase
        .from('leaderboard')
        .upsert([scoreData], { 
          onConflict: 'username',  // Column(s) that can conflict
          ignoreDuplicates: false  // We want to update on conflict
        });
        
      if (error) {
        console.error('Supabase error submitting score:', error);
        // Log detailed error information
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return false;
      }
      
      console.log('Score submitted successfully');
      return true;
    } catch (error) {
      console.error('Exception when submitting score:', error);
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
  
  /**
   * Subscribe to real-time leaderboard updates
   * @param callback Function to call when leaderboard updates
   */
  subscribeToLeaderboard(callback: (scores: ScoreEntry[]) => void): void {
    // Add listener to the list
    this.leaderboardListeners.push(callback);
    
    // If this is the first listener, set up the Supabase subscription
    if (this.leaderboardListeners.length === 1) {
      this.setupRealtimeSubscription();
    }
  }
  
  /**
   * Unsubscribe from leaderboard updates
   * @param callback The callback function to remove
   */
  unsubscribeFromLeaderboard(callback: (scores: ScoreEntry[]) => void): void {
    this.leaderboardListeners = this.leaderboardListeners.filter(
      listener => listener !== callback
    );
    
    // If no more listeners, remove the Supabase subscription
    if (this.leaderboardListeners.length === 0) {
      this.removeRealtimeSubscription();
    }
  }
  
  /**
   * Set up real-time subscription to leaderboard changes
   */
  private setupRealtimeSubscription(): void {
    try {
      this.leaderboardSubscription = this.supabase
        .channel('leaderboard-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'leaderboard' }, 
          async () => {
            // When any change happens to the leaderboard table, fetch the latest scores
            const scores = await this.getTopScores(10);
            this.notifyListeners(scores);
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  }
  
  /**
   * Remove real-time subscription
   */
  private removeRealtimeSubscription(): void {
    if (this.leaderboardSubscription) {
      this.supabase.removeChannel(this.leaderboardSubscription);
      this.leaderboardSubscription = null;
    }
  }
  
  /**
   * Notify all listeners of leaderboard updates
   */
  private notifyListeners(scores: ScoreEntry[]): void {
    for (const listener of this.leaderboardListeners) {
      listener(scores);
    }
  }
} 