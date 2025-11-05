// ABOUTME: Unit tests for usage type utilities including cost calculation and model name normalization
// ABOUTME: Tests pricing accuracy, token counting, and model name mapping for all Claude models

import {
  TokenCounts,
  MODEL_PRICING,
  normalizeModelName,
  calculateCost,
  getTotalTokens
} from '../usage';

describe('Usage Types', () => {
  describe('normalizeModelName', () => {
    it('should normalize Claude 3 Opus model names', () => {
      expect(normalizeModelName('claude-3-opus-20240229')).toBe('claude-3-opus');
      expect(normalizeModelName('Claude-3-Opus')).toBe('claude-3-opus');
      expect(normalizeModelName('CLAUDE_3_OPUS')).toBe('claude-3-opus');
    });

    it('should normalize Claude 3 Sonnet model names', () => {
      expect(normalizeModelName('claude-3-sonnet-20240229')).toBe('claude-3-sonnet');
      expect(normalizeModelName('Claude-3-Sonnet')).toBe('claude-3-sonnet');
    });

    it('should normalize Claude 3.5 Sonnet model names', () => {
      expect(normalizeModelName('claude-3-5-sonnet-20240620')).toBe('claude-3-5-sonnet');
      expect(normalizeModelName('claude-3.5-sonnet')).toBe('claude-3-5-sonnet');
      expect(normalizeModelName('Claude-3-5-Sonnet')).toBe('claude-3-5-sonnet');
    });

    it('should normalize Claude Sonnet 4 model names', () => {
      expect(normalizeModelName('claude-sonnet-4-20250514')).toBe('claude-sonnet-4');
      expect(normalizeModelName('claude_sonnet_4')).toBe('claude-sonnet-4');
      expect(normalizeModelName('Claude-Sonnet-4')).toBe('claude-sonnet-4');
    });

    it('should normalize Claude Sonnet 4.5 model names', () => {
      expect(normalizeModelName('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5');
      expect(normalizeModelName('claude-sonnet-4.5')).toBe('claude-sonnet-4-5');
      expect(normalizeModelName('Claude-Sonnet-4-5')).toBe('claude-sonnet-4-5');
    });

    it('should normalize Claude 3 Haiku model names', () => {
      expect(normalizeModelName('claude-3-haiku-20240307')).toBe('claude-3-haiku');
      expect(normalizeModelName('Claude-3-Haiku')).toBe('claude-3-haiku');
    });

    it('should return unknown model names as lowercase', () => {
      expect(normalizeModelName('claude-future-model')).toBe('claude-future-model');
      expect(normalizeModelName('Unknown-Model')).toBe('unknown-model');
    });
  });

  describe('getTotalTokens', () => {
    it('should calculate total tokens correctly', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 200,
        cache_read_tokens: 100
      };
      expect(getTotalTokens(tokens)).toBe(1800);
    });

    it('should handle zero cache tokens', () => {
      const tokens: TokenCounts = {
        input_tokens: 1000,
        output_tokens: 500,
        cache_creation_tokens: 0,
        cache_read_tokens: 0
      };
      expect(getTotalTokens(tokens)).toBe(1500);
    });

    it('should handle all zero tokens', () => {
      const tokens: TokenCounts = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_tokens: 0,
        cache_read_tokens: 0
      };
      expect(getTotalTokens(tokens)).toBe(0);
    });
  });

  describe('calculateCost', () => {
    describe('Claude 3 Opus', () => {
      it('should calculate cost correctly for input tokens only', () => {
        const tokens: TokenCounts = {
          input_tokens: 1_000_000,
          output_tokens: 0,
          cache_creation_tokens: 0,
          cache_read_tokens: 0
        };
        const cost = calculateCost(tokens, 'claude-3-opus');
        expect(cost).toBeCloseTo(15.0, 2);
      });

      it('should calculate cost correctly for output tokens only', () => {
        const tokens: TokenCounts = {
          input_tokens: 0,
          output_tokens: 1_000_000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0
        };
        const cost = calculateCost(tokens, 'claude-3-opus');
        expect(cost).toBeCloseTo(75.0, 2);
      });

      it('should calculate cost correctly for cache creation', () => {
        const tokens: TokenCounts = {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_tokens: 1_000_000,
          cache_read_tokens: 0
        };
        const cost = calculateCost(tokens, 'claude-3-opus');
        expect(cost).toBeCloseTo(18.75, 2);
      });

      it('should calculate cost correctly for cache reads', () => {
        const tokens: TokenCounts = {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_tokens: 0,
          cache_read_tokens: 1_000_000
        };
        const cost = calculateCost(tokens, 'claude-3-opus');
        expect(cost).toBeCloseTo(1.50, 2);
      });

      it('should calculate cost correctly for mixed tokens', () => {
        const tokens: TokenCounts = {
          input_tokens: 500_000,
          output_tokens: 250_000,
          cache_creation_tokens: 100_000,
          cache_read_tokens: 50_000
        };
        const cost = calculateCost(tokens, 'claude-3-opus');
        // (500k * 15 + 250k * 75 + 100k * 18.75 + 50k * 1.5) / 1M
        // = 7.5 + 18.75 + 1.875 + 0.075 = 28.2
        expect(cost).toBeCloseTo(28.2, 2);
      });
    });

    describe('Claude 3.5 Sonnet', () => {
      it('should calculate cost correctly for mixed tokens', () => {
        const tokens: TokenCounts = {
          input_tokens: 1_000_000,
          output_tokens: 500_000,
          cache_creation_tokens: 200_000,
          cache_read_tokens: 100_000
        };
        const cost = calculateCost(tokens, 'claude-3-5-sonnet');
        // (1M * 3 + 500k * 15 + 200k * 3.75 + 100k * 0.3) / 1M
        // = 3 + 7.5 + 0.75 + 0.03 = 11.28
        expect(cost).toBeCloseTo(11.28, 2);
      });
    });

    describe('Claude Sonnet 4', () => {
      it('should calculate cost correctly with Sonnet 4 pricing', () => {
        const tokens: TokenCounts = {
          input_tokens: 1_000_000,
          output_tokens: 500_000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0
        };
        const cost = calculateCost(tokens, 'claude-sonnet-4');
        // Same pricing as 3.5 Sonnet: (1M * 3 + 500k * 15) / 1M = 10.5
        expect(cost).toBeCloseTo(10.5, 2);
      });
    });

    describe('Claude Sonnet 4.5', () => {
      it('should calculate cost correctly with Sonnet 4.5 pricing', () => {
        const tokens: TokenCounts = {
          input_tokens: 1_000_000,
          output_tokens: 500_000,
          cache_creation_tokens: 0,
          cache_read_tokens: 0
        };
        const cost = calculateCost(tokens, 'claude-sonnet-4-5');
        // Same pricing as 3.5 Sonnet: (1M * 3 + 500k * 15) / 1M = 10.5
        expect(cost).toBeCloseTo(10.5, 2);
      });
    });

    describe('Claude 3 Haiku', () => {
      it('should calculate cost correctly for mixed tokens', () => {
        const tokens: TokenCounts = {
          input_tokens: 1_000_000,
          output_tokens: 500_000,
          cache_creation_tokens: 200_000,
          cache_read_tokens: 100_000
        };
        const cost = calculateCost(tokens, 'claude-3-haiku');
        // (1M * 0.25 + 500k * 1.25 + 200k * 0.30 + 100k * 0.03) / 1M
        // = 0.25 + 0.625 + 0.06 + 0.003 = 0.938
        expect(cost).toBeCloseTo(0.938, 3);
      });
    });

    it('should default to Sonnet 3.5 pricing for unknown models', () => {
      const tokens: TokenCounts = {
        input_tokens: 1_000_000,
        output_tokens: 0,
        cache_creation_tokens: 0,
        cache_read_tokens: 0
      };
      const cost = calculateCost(tokens, 'unknown-model');
      expect(cost).toBeCloseTo(3.0, 2);
    });

    it('should return zero cost for zero tokens', () => {
      const tokens: TokenCounts = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_tokens: 0,
        cache_read_tokens: 0
      };
      const cost = calculateCost(tokens, 'claude-3-opus');
      expect(cost).toBe(0);
    });
  });

  describe('MODEL_PRICING', () => {
    it('should have pricing for all major Claude models', () => {
      expect(MODEL_PRICING['claude-3-opus']).toBeDefined();
      expect(MODEL_PRICING['claude-3-sonnet']).toBeDefined();
      expect(MODEL_PRICING['claude-3-5-sonnet']).toBeDefined();
      expect(MODEL_PRICING['claude-sonnet-4']).toBeDefined();
      expect(MODEL_PRICING['claude-sonnet-4-5']).toBeDefined();
      expect(MODEL_PRICING['claude-3-haiku']).toBeDefined();
    });

    it('should have all required pricing fields', () => {
      Object.values(MODEL_PRICING).forEach(pricing => {
        expect(pricing.input).toBeGreaterThan(0);
        expect(pricing.output).toBeGreaterThan(0);
        expect(pricing.cache_creation).toBeGreaterThan(0);
        expect(pricing.cache_read).toBeGreaterThan(0);
      });
    });

    it('should have cache_creation price higher than input price', () => {
      Object.values(MODEL_PRICING).forEach(pricing => {
        expect(pricing.cache_creation).toBeGreaterThan(pricing.input);
      });
    });

    it('should have cache_read price lower than input price', () => {
      Object.values(MODEL_PRICING).forEach(pricing => {
        expect(pricing.cache_read).toBeLessThan(pricing.input);
      });
    });
  });
});
