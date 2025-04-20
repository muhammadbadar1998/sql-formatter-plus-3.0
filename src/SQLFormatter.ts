// 1. Import VS Code API types for constructing text edits:
import { TextEdit, Range, Position } from 'vscode';

// 2. Import your array of SQL keywords from the WordList file:
import { sqlKeywords } from './WordList';