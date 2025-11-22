
import React from 'react';

export interface SimulationControl {
  id: string;
  label: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue: number | boolean | string;
}

export interface SimulationState {
  [key: string]: number | boolean | string;
}

export interface Visual2D {
  title: string;
  description: string;
  drawInstructions: string; // Description for the illustrator
  labels: string[];
}

export interface Scene3D {
  id: string;
  title: string;
  description: string;
  objects: string[];
  controls: SimulationControl[];
  learningOutcome: string;
  renderLogic: (state: SimulationState) => React.ReactNode; // Simplified render for 2D representation of 3D concept
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Vignette {
  title: string;
  scenario: string;
  question: string;
  answer: string;
  explanation: string;
}

export interface ModuleContent {
  id: string;
  title: string;
  overview: string[];
  explainer: string; // HTML/Markdown string for conceptual summary
  detailedContent: string; // Full Harrison's text
  visuals: Visual2D[];
  scenes: Scene3D[];
  tables: { title: string; content: string[][] }[]; // Simple grid
  quiz: QuizQuestion[];
  vignettes: Vignette[];
  mnemonics: { hook: string; explanation: string }[];
}
