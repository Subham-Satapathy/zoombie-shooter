import * as THREE from 'three';

/**
 * Utility functions for mathematical operations in the game
 */
export class MathUtils {
  /**
   * Get a random position on the ground within a specified radius
   * @param center Center point
   * @param minRadius Minimum radius from center
   * @param maxRadius Maximum radius from center
   * @returns Random position vector
   */
  static getRandomPositionOnGround(
    center: THREE.Vector3, 
    minRadius: number = 5, 
    maxRadius: number = 30
  ): THREE.Vector3 {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const angle = Math.random() * Math.PI * 2;
    
    return new THREE.Vector3(
      center.x + Math.cos(angle) * radius,
      0, // Ground level
      center.z + Math.sin(angle) * radius
    );
  }
  
  /**
   * Checks if a position is within a given radius of another position
   * @param pos1 First position
   * @param pos2 Second position
   * @param radius Maximum distance
   * @returns Boolean indicating if positions are within radius
   */
  static isWithinRadius(pos1: THREE.Vector3, pos2: THREE.Vector3, radius: number): boolean {
    return pos1.distanceTo(pos2) <= radius;
  }
  
  /**
   * Lerps between two values with a given alpha
   * @param start Start value
   * @param end End value
   * @param alpha Alpha value (0-1)
   * @returns Interpolated value
   */
  static lerp(start: number, end: number, alpha: number): number {
    return start + (end - start) * alpha;
  }
  
  /**
   * Clamps a value between min and max
   * @param value Value to clamp
   * @param min Minimum value
   * @param max Maximum value
   * @returns Clamped value
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Converts degrees to radians
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 