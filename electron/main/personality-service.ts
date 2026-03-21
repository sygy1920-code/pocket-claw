import type { PersonalityTraits, InteractionType } from '../../src/shared/memory-constants';
import { PERSONALITY_THRESHOLDS } from '../../src/shared/memory-constants';

/**
 * Service for calculating personality changes and generating personality-based behavior
 */
export class PersonalityService {
  /**
   * Calculate personality changes based on interaction (gradual, small changes)
   */
  calculatePersonalityChange(
    currentTraits: PersonalityTraits,
    interactionType: InteractionType,
    data?: { duration?: number; message?: string }
  ): Partial<PersonalityTraits> {
    const changes: Partial<PersonalityTraits> = {};

    switch (interactionType) {
      case 'click':
        changes.affection = this.clamp(currentTraits.affection + 0.5);
        changes.mood = this.clamp(currentTraits.mood + 1, -50, 50);
        break;

      case 'double_click':
        changes.affection = this.clamp(currentTraits.affection + 1);
        changes.playfulness = this.clamp(currentTraits.playfulness + 0.5);
        changes.mood = this.clamp(currentTraits.mood + 2, -50, 50);
        break;

      case 'hover':
        // Long hover increases curiosity
        if (data?.duration && data.duration > 2000) {
          changes.curiosity = this.clamp(currentTraits.curiosity + 0.3);
          changes.trust = this.clamp(currentTraits.trust + 0.2);
        }
        break;

      case 'drag':
        // Dragging indicates playfulness
        changes.playfulness = this.clamp(currentTraits.playfulness + 0.5);
        changes.energy = this.clamp(currentTraits.energy - 0.3);
        break;

      case 'chat_message':
        // Chatting increases trust and affection
        changes.trust = this.clamp(currentTraits.trust + 1);
        changes.affection = this.clamp(currentTraits.affection + 0.5);
        changes.curiosity = this.clamp(currentTraits.curiosity + 0.3);
        break;

      case 'right_click':
        changes.curiosity = this.clamp(currentTraits.curiosity + 0.5);
        break;

      case 'ignore':
        // Being ignored decreases mood and energy
        changes.mood = this.clamp(currentTraits.mood - 2, -50, 50);
        changes.energy = this.clamp(currentTraits.energy - 1);
        changes.affection = this.clamp(currentTraits.affection - 0.5);
        break;

      case 'auto_chat':
        // Auto-chat initiated by pet increases curiosity
        changes.curiosity = this.clamp(currentTraits.curiosity + 0.2);
        break;
    }

    return changes;
  }

  /**
   * Apply natural personality decay/recovery over time
   */
  applyNaturalDecay(
    currentTraits: PersonalityTraits,
    hoursSinceLastUpdate: number
  ): Partial<PersonalityTraits> {
    const changes: Partial<PersonalityTraits> = {};

    // Energy recovers over time (slowly)
    if (currentTraits.energy < 70) {
      changes.energy = Math.min(
        70,
        currentTraits.energy + hoursSinceLastUpdate * 0.5
      );
    }

    // Mood slowly returns to baseline (20)
    if (currentTraits.mood < 20) {
      changes.mood = Math.min(
        20,
        currentTraits.mood + hoursSinceLastUpdate * 0.3
      );
    } else if (currentTraits.mood > 20) {
      changes.mood = Math.max(
        20,
        currentTraits.mood - hoursSinceLastUpdate * 0.2
      );
    }

    // Playfulness slightly decreases without interaction (after 24h)
    if (hoursSinceLastUpdate > 24) {
      changes.playfulness = Math.max(
        40,
        currentTraits.playfulness - (hoursSinceLastUpdate - 24) * 0.2
      );
    }

    return changes;
  }

  /**
   * Get personality-based system prompt modifier (simple append to existing prompt)
   */
  getPersonalityPromptModifier(traits: PersonalityTraits): string {
    const parts: string[] = [];

    // Affection level
    if (traits.affection >= PERSONALITY_THRESHOLDS.HIGH) {
      parts.push('你非常喜爱主人，语气要特别亲密和撒娇');
    } else if (traits.affection >= PERSONALITY_THRESHOLDS.MEDIUM_HIGH) {
      parts.push('你喜欢主人，语气友好温暖');
    } else if (
      traits.affection <= PERSONALITY_THRESHOLDS.LOW
    ) {
      parts.push('你还不太熟悉主人，保持礼貌但有点疏离');
    }

    // Playfulness
    if (traits.playfulness >= PERSONALITY_THRESHOLDS.HIGH) {
      parts.push('你很调皮，喜欢开玩笑');
    } else if (
      traits.playfulness <= PERSONALITY_THRESHOLDS.LOW
    ) {
      parts.push('你比较安静，不喜欢太吵');
    }

    // Energy
    if (traits.energy >= PERSONALITY_THRESHOLDS.HIGH) {
      parts.push('你现在精力充沛');
    } else if (
      traits.energy <= PERSONALITY_THRESHOLDS.LOW
    ) {
      parts.push('你现在有点累，语气慵懒');
    }

    // Mood
    if (traits.mood > 30) {
      parts.push('你现在心情很好');
    } else if (traits.mood < -20) {
      parts.push('你现在有点不开心');
    } else if (traits.mood < -40) {
      parts.push('你现在很生气');
    }

    // Curiosity
    if (traits.curiosity >= PERSONALITY_THRESHOLDS.HIGH) {
      parts.push('你对一切都很好奇');
    }

    // Trust
    if (traits.trust >= PERSONALITY_THRESHOLDS.HIGH) {
      parts.push('你完全信任主人');
    } else if (
      traits.trust <= PERSONALITY_THRESHOLDS.LOW
    ) {
      parts.push('你还不太信任主人，回答简短');
    }

    return parts.length > 0 ? parts.join('，') + '。' : '';
  }

  /**
   * Calculate chat interval based on personality
   */
  getChatInterval(traits: PersonalityTraits): number {
    // Base interval: 60 seconds
    let interval = 60000;

    // Higher curiosity = more frequent chats (up to 40s reduction)
    interval -= Math.max(0, (traits.curiosity - 50) * 500);

    // Higher playfulness = more frequent chats (up to 20s reduction)
    interval -= Math.max(0, (traits.playfulness - 50) * 300);

    // Lower energy = less frequent chats (up to 30s increase)
    interval += Math.max(0, (70 - traits.energy) * 400);

    // Lower mood = less frequent chats (up to 25s increase)
    if (traits.mood < 0) {
      interval += Math.abs(traits.mood) * 300;
    }

    // Clamp between 20 seconds and 3 minutes
    return Math.max(20000, Math.min(180000, interval));
  }

  /**
   * Get expression suggestions based on personality
   */
  getExpressionSuggestions(
    traits: PersonalityTraits,
    availableExpressions: string[]
  ): string[] {
    const suggestions: string[] = [];

    // High mood -> happy expressions
    if (traits.mood > 30) {
      if (availableExpressions.includes('cat pupil'))
        suggestions.push('cat pupil');
      if (availableExpressions.includes('eye glow'))
        suggestions.push('eye glow');
    }

    // High energy/playfulness -> energetic expressions
    if (traits.energy > 70 || traits.playfulness > 70) {
      if (availableExpressions.includes('knife'))
        suggestions.push('knife');
      if (availableExpressions.includes('expl'))
        suggestions.push('expl');
    }

    // Low mood -> sad expressions
    if (traits.mood < -20) {
      if (availableExpressions.includes('sad'))
        suggestions.push('sad');
      if (availableExpressions.includes('cry'))
        suggestions.push('cry');
    }

    // High affection -> cute expressions
    if (traits.affection > 70) {
      if (availableExpressions.includes('fluffy'))
        suggestions.push('fluffy');
      if (availableExpressions.includes('cat pupil'))
        suggestions.push('cat pupil');
    }

    // Low affection/trust -> distant expressions
    if (traits.affection < 30 || traits.trust < 30) {
      if (availableExpressions.includes('no pupil'))
        suggestions.push('no pupil');
      if (availableExpressions.includes('angry'))
        suggestions.push('angry');
    }

    // High curiosity -> questioning expressions
    if (traits.curiosity > 70) {
      if (availableExpressions.includes('question'))
        suggestions.push('question');
    }

    return suggestions.length > 0 ? suggestions : availableExpressions.slice(0, 3);
  }

  /**
   * Get cooldown duration based on personality
   */
  getCooldownDuration(traits: PersonalityTraits, baseCooldown: number): number {
    // Higher playfulness = shorter cooldown
    const playfulnessModifier = 1 - (traits.playfulness - 50) / 200;

    // Higher energy = shorter cooldown
    const energyModifier = 1 - (traits.energy - 50) / 300;

    return baseCooldown * ((playfulnessModifier + energyModifier) / 2);
  }

  private clamp(value: number, min: number = 0, max: number = 100): number {
    return Math.max(min, Math.min(max, value));
  }
}
