import fetch from 'node-fetch';
import pool from '../db';
import { createNotification } from '../services/notificationService';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  created_at: string;
  state: string;
}

interface Subscription {
  id: number;
  user_id: number;
  repo: string;
  keyword: string;
}

async function fetchIssuesSince(repo: string, since: string): Promise<GitHubIssue[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const url = `${GITHUB_API_BASE}/repos/${repo}/issues?since=${since}&state=all&per_page=100&sort=created&direction=asc`;
  const response = await fetch(url, { headers });

  if (response.status === 404) {
    console.warn(`[poller] Repo not found: ${repo}`);
    return [];
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<GitHubIssue[]>;
}

async function getOrInitRepoState(repo: string): Promise<string> {
  const result = await pool.query(
    `SELECT last_checked_at FROM repo_state WHERE repo = $1`,
    [repo]
  );
  if (result.rows.length === 0) {
    // First time seeing this repo — look back 1 hour so we catch very recent issues
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await pool.query(
      `INSERT INTO repo_state (repo, last_checked_at) VALUES ($1, $2)`,
      [repo, oneHourAgo]
    );
    return oneHourAgo;
  }
  return result.rows[0].last_checked_at as string;
}

async function updateRepoState(repo: string, checkedAt: string): Promise<void> {
  await pool.query(
    `INSERT INTO repo_state (repo, last_checked_at) VALUES ($1, $2)
     ON CONFLICT (repo) DO UPDATE SET last_checked_at = EXCLUDED.last_checked_at`,
    [repo, checkedAt]
  );
}

async function getUniqueRepos(): Promise<string[]> {
  const result = await pool.query<{ repo: string }>(
    `SELECT DISTINCT repo FROM subscriptions`
  );
  return result.rows.map((r) => r.repo);
}

async function getSubscriptionsForRepo(repo: string): Promise<Subscription[]> {
  const result = await pool.query<Subscription>(
    `SELECT id, user_id, repo, keyword FROM subscriptions WHERE repo = $1`,
    [repo]
  );
  return result.rows;
}

async function pollRepo(repo: string): Promise<void> {
  const since = await getOrInitRepoState(repo);
  const now = new Date().toISOString();

  let issues: GitHubIssue[];
  try {
    issues = await fetchIssuesSince(repo, since);
  } catch (err) {
    console.error(`[poller] Failed to fetch issues for ${repo}:`, err);
    return;
  }

  if (issues.length === 0) {
    await updateRepoState(repo, now);
    return;
  }

  console.log(`[poller] ${repo}: ${issues.length} new issue(s) to check`);

  const subscriptions = await getSubscriptionsForRepo(repo);

  for (const issue of issues) {
    const text = `${issue.title} ${issue.body ?? ''}`.toLowerCase();

    for (const sub of subscriptions) {
      if (text.includes(sub.keyword.toLowerCase())) {
        console.log(`[poller] Match! Keyword "${sub.keyword}" in: ${issue.title}`);
        try {
          await createNotification({
            userId: sub.user_id,
            subscriptionId: sub.id,
            repo,
            keyword: sub.keyword,
            issueTitle: issue.title,
            issueBody: issue.body ?? '',
            issueUrl: issue.html_url,
          });
        } catch (err) {
          console.error('[poller] Failed to create notification:', err);
        }
      }
    }
  }

  await updateRepoState(repo, now);
}

async function runPollCycle(): Promise<void> {
  const repos = await getUniqueRepos();
  if (repos.length === 0) return;

  console.log(`[poller] Polling ${repos.length} repo(s)...`);
  await Promise.allSettled(repos.map(pollRepo));
}

export function startPoller(): void {
  console.log(`[poller] Starting — interval: ${POLL_INTERVAL_MS / 1000}s`);
  // Run immediately on start, then on interval
  runPollCycle().catch(console.error);
  setInterval(() => runPollCycle().catch(console.error), POLL_INTERVAL_MS);
}
