/**
 * Extension points for a possible future paid tier (batch export, sync).
 * Interfaces only; nothing here is implemented and nothing is enabled.
 * Any implementation must keep the local-first promise: no data leaves the
 * device unless the user explicitly configures a destination they own.
 */
import type { Conversation } from '../types';

export interface BatchExportSource {
  /** List conversation references available to the user in the open tab. */
  listConversations(): Promise<{ id: string; title: string }[]>;
  loadConversation(id: string): Promise<Conversation>;
}

export interface BatchExporter {
  exportMany(source: BatchExportSource, format: 'markdown' | 'json' | 'pdf'): Promise<void>;
}

export interface SyncTarget {
  id: string;
  label: string;
  write(c: Conversation): Promise<void>;
}
