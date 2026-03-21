import type { PersonalityTraits, PersonalityState } from '../../shared/memory-constants';
import type { InteractionType } from '../../shared/memory-constants';

/**
 * Renderer-side personality engine for behavior calculation
 */
export class PersonalityEngine {
  private traits: PersonalityTraits;
  private state: PersonalityState;

  constructor(initialState: PersonalityState) {
    this.state = initialState;
    this.traits = { ...initialState.traits };
  }

  updateTraits(newTraits: Partial<PersonalityTraits>): void {
    this.traits = { ...this.traits, ...newTraits };
    this.state.lastUpdate = Date.now();
  }

  updateState(newState: PersonalityState): void {
    this.state = { ...newState };
    this.traits = { ...newState.traits };
  }

  getTraits(): PersonalityTraits {
    return { ...this.traits };
  }

  getState(): PersonalityState {
    return { ...this.state, traits: this.getTraits() };
  }

  /**
   * Determine if pet should initiate auto-chat based on personality
   */
  shouldInitiateChat(): boolean {
    // Higher curiosity = more likely to initiate
    const curiosityChance = this.traits.curiosity / 100;

    // Higher energy = more likely to initiate
    const energyChance = this.traits.energy / 100;

    // Low mood = less likely to initiate
    const moodModifier = this.traits.mood > 0 ? 0.1 : -0.1;

    const chance = curiosityChance * 0.5 + energyChance * 0.3 + moodModifier;

    return Math.random() < Math.max(0.1, Math.min(0.9, chance));
  }

  /**
   * Get expression weighting based on personality
   */
  getExpressionWeights(availableExpressions: string[]): Map<string, number> {
    const weights = new Map<string, number>();

    availableExpressions.forEach((expr) => {
      let weight = 1.0;

      // Mood-based weighting
      if (this.traits.mood > 30 &&
          ['cat pupil', 'eye glow', 'fluffy'].includes(expr)) {
        weight *= 1.5;
      }
      if (this.traits.mood < -20 &&
          ['sad', 'cry', 'angry'].includes(expr)) {
        weight *= 1.5;
      }

      // Affection-based weighting
      if (this.traits.affection > 70 &&
          ['cat pupil', 'fluffy'].includes(expr)) {
        weight *= 1.3;
      }
      if (this.traits.affection < 30 &&
          ['no pupil', 'angry'].includes(expr)) {
        weight *= 1.3;
      }

      // Energy-based weighting
      if (this.traits.energy > 70 &&
          ['knife', 'expl', 'long'].includes(expr)) {
        weight *= 1.4;
      }
      if (this.traits.energy < 30 &&
          ['sad', 'cry'].includes(expr)) {
        weight *= 1.2;
      }

      // Playfulness-based weighting
      if (this.traits.playfulness > 70 &&
          ['knife', 'expl', 'question'].includes(expr)) {
        weight *= 1.3;
      }

      weights.set(expr, weight);
    });

    return weights;
  }

  /**
   * Select expression based on personality weights
   */
  selectExpression(availableExpressions: string[]): string {
    if (availableExpressions.length === 0) {
      return '';
    }

    const weights = this.getExpressionWeights(availableExpressions);

    // Convert weights to probabilities
    const totalWeight = Array.from(weights.values()).reduce(
      (sum, w) => sum + w,
      0
    );
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (const [expr, weight] of weights.entries()) {
      cumulative += weight;
      if (random <= cumulative) {
        return expr;
      }
    }

    // Fallback to random
    return availableExpressions[Math.floor(Math.random() * availableExpressions.length)];
  }

  /**
   * Get cooldown duration based on personality
   */
  getCooldownDuration(baseCooldown: number): number {
    // Higher playfulness = shorter cooldown
    const playfulnessModifier = 1 - (this.traits.playfulness - 50) / 200;

    // Higher energy = shorter cooldown
    const energyModifier = 1 - (this.traits.energy - 50) / 300;

    return baseCooldown * ((playfulnessModifier + energyModifier) / 2);
  }

  /**
   * Check if pet should react to interaction
   */
  shouldReact(interactionType: InteractionType): boolean {
    switch (interactionType) {
      case 'click':
      case 'double_click':
        return true;

      case 'hover':
        // React based on curiosity
        return Math.random() < this.traits.curiosity / 100;

      case 'drag':
        // React based on playfulness
        return Math.random() < this.traits.playfulness / 100;

      default:
        return true;
    }
  }

  /**
   * Get animation speed modifier based on energy
   */
  getAnimationSpeedModifier(): number {
    // Energy 0-100 maps to 0.5x-1.5x speed
    return Math.max(0.5, Math.min(1.5, 0.5 + this.traits.energy / 100));
  }

  /**
   * Get personality description for display
   */
  getPersonalityDescription(): string {
    const descriptions: string[] = [];

    if (this.traits.affection > 80) {
      descriptions.push('非常粘人');
    } else if (this.traits.affection > 60) {
      descriptions.push('友好');
    } else if (this.traits.affection < 30) {
      descriptions.push('有些疏离');
    }

    if (this.traits.playfulness > 80) {
      descriptions.push('超级调皮');
    } else if (this.traits.playfulness > 60) {
      descriptions.push('活泼');
    } else if (this.traits.playfulness < 30) {
      descriptions.push('安静');
    }

    if (this.traits.energy > 80) {
      descriptions.push('精力充沛');
    } else if (this.traits.energy < 30) {
      descriptions.push('有点累');
    }

    if (this.traits.mood > 30) {
      descriptions.push('很开心');
    } else if (this.traits.mood < -20) {
      descriptions.push('心情不好');
    }

    if (this.traits.curiosity > 80) {
      descriptions.push('充满好奇');
    }

    if (this.traits.trust > 80) {
      descriptions.push('完全信任');
    } else if (this.traits.trust < 30) {
      descriptions.push('还有些警惕');
    }

    return descriptions.length > 0 ? descriptions.join('、') : '普通';
  }
}
