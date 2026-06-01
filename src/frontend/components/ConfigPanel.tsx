import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface BestPractice {
  id: string;
  pattern: string;
  guidanceText: string;
  createdAt: string;
}

interface HITLProposal {
  id: string;
  triggerPattern: string;
  suggestedGuidance: string;
  status: 'pending' | 'approved' | 'rejected';
  confidenceScore: number;
  createdAt: string;
}

export default function ConfigPanel() {
  const [bestPractices, setBestPractices] = useState<BestPractice[]>([]);
  const [hitlProposals, setHitlProposals] = useState<HITLProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPattern, setNewPattern] = useState('');
  const [newGuidance, setNewGuidance] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [practices, proposals] = await Promise.all([
        fetch('/api/best-practices').then(r => r.json()),
        fetch('/api/hitl-proposals').then(r => r.json())
      ]);
      setBestPractices(practices);
      setHitlProposals(proposals);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createBestPractice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch('/api/best-practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: newPattern, guidanceText: newGuidance })
      });
      setNewPattern('');
      setNewGuidance('');
      await loadData();
    } catch (error) {
      console.error('Failed to create best practice:', error);
    }
  }

  async function deleteBestPractice(id: string) {
    try {
      await fetch(`/api/best-practices/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete best practice:', error);
    }
  }

  async function approveProposal(id: string) {
    try {
      await fetch(`/api/hitl-proposals/${id}/approve`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Failed to approve proposal:', error);
    }
  }

  async function rejectProposal(id: string) {
    try {
      await fetch(`/api/hitl-proposals/${id}/reject`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  const pendingProposals = hitlProposals.filter(p => p.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Best Practices Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-2xl font-bold mb-4">Best Practices Registry</h2>

        <form onSubmit={createBestPractice} className="mb-6 space-y-4">
          <div>
            <label htmlFor="pattern" className="block text-sm font-medium mb-2">
              Pattern
            </label>
            <input
              id="pattern"
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g., wrangler types"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="guidance" className="block text-sm font-medium mb-2">
              Guidance Text
            </label>
            <textarea
              id="guidance"
              value={newGuidance}
              onChange={(e) => setNewGuidance(e.target.value)}
              placeholder="Enter guidance that will be prepended to agent responses..."
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add Best Practice
          </button>
        </form>

        <div className="space-y-2">
          {bestPractices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No best practices configured yet
            </div>
          ) : (
            bestPractices.map((practice) => (
              <div
                key={practice.id}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <div className="font-semibold mb-1">{practice.pattern}</div>
                  <div className="text-sm text-muted-foreground">{practice.guidanceText}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(practice.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => deleteBestPractice(practice.id)}
                  className="ml-4 text-destructive hover:text-destructive/80 text-sm"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* HITL Proposals Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-2xl font-bold mb-4">HITL Proposals Queue</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Agent-generated guidance proposals awaiting human approval
        </p>

        <div className="space-y-2">
          {pendingProposals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No pending proposals
            </div>
          ) : (
            pendingProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-lg border p-4 bg-accent/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold mb-1">
                      Pattern: {proposal.triggerPattern}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {proposal.suggestedGuidance}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(proposal.confidenceScore * 100).toFixed(0)}% •
                      Created: {new Date(proposal.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveProposal(proposal.id)}
                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectProposal(proposal.id)}
                    className="inline-flex items-center justify-center rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/80 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
