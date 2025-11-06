// ABOUTME: Script to generate notification sounds programmatically
// ABOUTME: Creates WAV files with synthesized tones for different notification types

const fs = require('fs');
const path = require('path');

class WavGenerator {
  constructor() {
    this.sampleRate = 44100;
    this.bitDepth = 16;
  }

  generateWav(samples, filename) {
    const buffer = Buffer.alloc(44 + samples.length * 2);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples.length * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(this.sampleRate, 24);
    buffer.writeUInt32LE(this.sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(this.bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length * 2, 40);

    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const intSample = Math.floor(sample * 32767);
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Generated: ${path.basename(filename)}`);
  }

  applyEnvelope(samples, attack, decay, sustain, release) {
    const result = new Float32Array(samples.length);
    const attackSamples = Math.floor(attack * this.sampleRate);
    const decaySamples = Math.floor(decay * this.sampleRate);
    const releaseSamples = Math.floor(release * this.sampleRate);
    const sustainSamples = samples.length - attackSamples - decaySamples - releaseSamples;

    let idx = 0;

    for (let i = 0; i < attackSamples && idx < samples.length; i++, idx++) {
      result[idx] = samples[idx] * (i / attackSamples);
    }

    for (let i = 0; i < decaySamples && idx < samples.length; i++, idx++) {
      result[idx] = samples[idx] * (1 - (1 - sustain) * (i / decaySamples));
    }

    for (let i = 0; i < sustainSamples && idx < samples.length; i++, idx++) {
      result[idx] = samples[idx] * sustain;
    }

    for (let i = 0; i < releaseSamples && idx < samples.length; i++, idx++) {
      result[idx] = samples[idx] * sustain * (1 - i / releaseSamples);
    }

    return result;
  }

  generateTone(frequency, duration, amplitude = 0.3) {
    const samples = new Float32Array(Math.floor(duration * this.sampleRate));
    for (let i = 0; i < samples.length; i++) {
      samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / this.sampleRate);
    }
    return samples;
  }

  mixSamples(sampleArrays) {
    const maxLength = Math.max(...sampleArrays.map(s => s.length));
    const result = new Float32Array(maxLength);

    for (const samples of sampleArrays) {
      for (let i = 0; i < samples.length; i++) {
        result[i] += samples[i];
      }
    }

    const max = Math.max(...Array.from(result).map(Math.abs));
    if (max > 0) {
      for (let i = 0; i < result.length; i++) {
        result[i] /= max;
      }
    }

    return result;
  }

  generateCompletion(outputPath) {
    const tone1 = this.applyEnvelope(
      this.generateTone(800, 0.15, 0.4),
      0.005, 0.02, 0.8, 0.08
    );

    const tone2 = this.applyEnvelope(
      this.generateTone(1200, 0.15, 0.4),
      0.005, 0.02, 0.8, 0.08
    );

    const combined = new Float32Array(Math.floor(0.4 * this.sampleRate));
    const delay = Math.floor(0.08 * this.sampleRate);

    for (let i = 0; i < tone1.length; i++) {
      combined[i] = tone1[i];
    }

    for (let i = 0; i < tone2.length; i++) {
      const idx = i + delay;
      if (idx < combined.length) {
        combined[idx] += tone2[i];
      }
    }

    const max = Math.max(...Array.from(combined).map(Math.abs));
    for (let i = 0; i < combined.length; i++) {
      combined[i] = combined[i] / max * 0.7;
    }

    this.generateWav(combined, outputPath);
  }

  generateSubtle(outputPath) {
    const tone = this.applyEnvelope(
      this.generateTone(1800, 0.08, 0.25),
      0.002, 0.01, 0.6, 0.04
    );

    this.generateWav(tone, outputPath);
  }

  generateClassic(outputPath) {
    const fundamental = this.generateTone(880, 0.5, 0.4);
    const harmonic1 = this.generateTone(880 * 2, 0.5, 0.15);
    const harmonic2 = this.generateTone(880 * 3, 0.5, 0.08);

    const combined = this.mixSamples([fundamental, harmonic1, harmonic2]);
    const shaped = this.applyEnvelope(combined, 0.005, 0.08, 0.3, 0.3);

    this.generateWav(shaped, outputPath);
  }

  generateAlert(outputPath) {
    const beep1 = this.applyEnvelope(
      this.generateTone(1000, 0.12, 0.35),
      0.005, 0.02, 0.7, 0.05
    );

    const beep2 = this.applyEnvelope(
      this.generateTone(1200, 0.12, 0.35),
      0.005, 0.02, 0.7, 0.05
    );

    const beep3 = this.applyEnvelope(
      this.generateTone(1400, 0.12, 0.35),
      0.005, 0.02, 0.7, 0.05
    );

    const combined = new Float32Array(Math.floor(0.5 * this.sampleRate));
    const gap = Math.floor(0.08 * this.sampleRate);

    for (let i = 0; i < beep1.length; i++) {
      combined[i] = beep1[i];
    }
    for (let i = 0; i < beep2.length; i++) {
      const idx = i + beep1.length + gap;
      if (idx < combined.length) combined[idx] = beep2[i];
    }
    for (let i = 0; i < beep3.length; i++) {
      const idx = i + beep1.length + gap + beep2.length + gap;
      if (idx < combined.length) combined[idx] = beep3[i];
    }

    const max = Math.max(...Array.from(combined).map(Math.abs));
    for (let i = 0; i < combined.length; i++) {
      combined[i] = combined[i] / max * 0.7;
    }

    this.generateWav(combined, outputPath);
  }

  generateSuccess(outputPath) {
    const tone1 = this.generateTone(660, 0.1, 0.3);
    const tone2 = this.generateTone(880, 0.1, 0.3);
    const tone3 = this.generateTone(1320, 0.2, 0.3);

    const combined = new Float32Array(Math.floor(0.5 * this.sampleRate));
    const gap = Math.floor(0.06 * this.sampleRate);

    let offset = 0;
    for (let i = 0; i < tone1.length; i++) {
      combined[offset + i] = tone1[i];
    }

    offset += tone1.length;
    for (let i = 0; i < tone2.length; i++) {
      combined[offset + i] += tone2[i];
    }

    offset += gap;
    for (let i = 0; i < tone3.length; i++) {
      if (offset + i < combined.length) {
        combined[offset + i] += tone3[i];
      }
    }

    const shaped = this.applyEnvelope(combined, 0.005, 0.05, 0.6, 0.15);

    const max = Math.max(...Array.from(shaped).map(Math.abs));
    for (let i = 0; i < shaped.length; i++) {
      shaped[i] = shaped[i] / max * 0.7;
    }

    this.generateWav(shaped, outputPath);
  }
}

const generator = new WavGenerator();
const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

console.log('Generating notification sounds...\n');

generator.generateCompletion(path.join(soundsDir, 'completion.wav'));
generator.generateSubtle(path.join(soundsDir, 'subtle.wav'));
generator.generateClassic(path.join(soundsDir, 'classic.wav'));
generator.generateAlert(path.join(soundsDir, 'alert.wav'));
generator.generateSuccess(path.join(soundsDir, 'success.wav'));

console.log('\nAll sounds generated successfully!');
console.log(`Output directory: ${soundsDir}`);
