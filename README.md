# github-tools

Automatically generated SVG charts built from your GitHub activity, ready to display in your profile README. Everything runs in GitHub Actions: no server, no dependencies, just Node.js and the GitHub API.

## Preview

![Commit activity](https://raw.githubusercontent.com/Josh012006/github-tools/main/dist/activity-graph.svg)
![Commit stats](https://raw.githubusercontent.com/Josh012006/github-tools/main/dist/streak-stats.svg)
![Languages](https://raw.githubusercontent.com/Josh012006/github-tools/main/dist/languages.svg)
![Recent languages](https://raw.githubusercontent.com/Josh012006/github-tools/main/dist/recent-languages.svg)

## Available tools

| Generated file | Script | Content |
|---|---|---|
| `dist/activity-graph.svg` | `scripts/generate-graph.mjs` | Curve of commits per day over the last 30 days. |
| `dist/streak-stats.svg` | `scripts/generate-stats.mjs` | Total commits since your account was created, total contributions, current streak and longest streak (in days). |
| `dist/languages.svg` | `scripts/generate-languages.mjs` | Most used languages by code size, across all your repos (forks excluded). |
| `dist/recent-languages.svg` | `scripts/generate-recent-languages.mjs` | Recently used languages: commits from the last 90 days are split across each repo's languages. |

The file `scripts/lib.mjs` holds the shared code (API calls, theme, bar drawing).

## Setup

### 1. Fork the repo

Click **Fork** at the top of this page. The forked repo must stay **public**: your profile README loads the images from `raw.githubusercontent.com`, which does not work for a private repo.

### 2. Create a personal access token (PAT)

The automatic `GITHUB_TOKEN` provided by Actions cannot read your contributions across all your repos, so you need a token of your own.

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Give it a name (for example `github-tools`) and an expiration date.
4. Check the **`read:user`** scope.
5. Also check **`repo`** only if you want the language charts to include your **private repos**. It is a broad scope: only take it if you need it.
6. Generate the token and copy it right away (it is only shown once).

For commits from private repos to appear in the activity graph and the streaks, also enable **your profile → Contribution settings → "Private contributions"**.

### 3. Add the token as a secret

In **your fork → Settings → Secrets and variables → Actions → New repository secret**:

- **Name**: `GH_STATS_TOKEN`
- **Secret**: the token you copied in the previous step

The token is never written in the code. Nobody can read it, even on a public repo, and GitHub masks it in the logs.

### 4. Set your username

In `.github/workflows/update-graph.yml`, replace the value of `GH_USERNAME` with your GitHub username:

```yaml
env:
  GH_TOKEN: ${{ secrets.GH_STATS_TOKEN }}
  GH_USERNAME: your-username
```

### 5. Enable Actions on the fork

GitHub disables workflows on forks by default. Go to the **Actions** tab of your fork and click **"I understand my workflows, go ahead and enable them"**.

### 6. First run

Go to **Actions → "Update GitHub stats" → Run workflow**. When the run is green, the `dist/` folder appears in the repo with the four SVGs. If it fails, the log shows the exact API error (missing token, insufficient scope, etc.).

### 7. Display the charts in your profile

In the README of your profile repo (the repo named exactly like your username), add the lines you want, replacing `your-username`:

```md
![Commit activity](https://raw.githubusercontent.com/your-username/github-tools/main/dist/activity-graph.svg)
![Commit stats](https://raw.githubusercontent.com/your-username/github-tools/main/dist/streak-stats.svg)
![Languages](https://raw.githubusercontent.com/your-username/github-tools/main/dist/languages.svg)
![Recent languages](https://raw.githubusercontent.com/your-username/github-tools/main/dist/recent-languages.svg)
```

If you renamed the fork, also replace `github-tools` in the URL. The branch must be called `main`.

## Updates

The workflow `.github/workflows/update-graph.yml` regenerates the charts in these cases:

| Trigger | When |
|---|---|
| **Schedule** | Every hour (`0 * * * *`). This is what updates the charts after each new commit and on each new day. |
| **Push to `main`** | Whenever the code or configuration of the repo changes (changes in `dist/` are ignored to avoid a loop). |
| **Manual** | Actions tab → "Update GitHub stats" → Run workflow. |

What this implies:

- **Delay**: a new commit shows up in the charts at most about one hour later. GitHub may also delay scheduled runs when it is under heavy load. For an immediate refresh, use the manual run.
- **No noise in the history**: the SVGs contain no date or time, so the workflow only creates a commit (`chore: update stats`) when the data has actually changed.
- **Image caching**: GitHub sometimes caches README images for a few minutes after a change.
- **Disabled scheduled workflows**: according to GitHub's documentation, scheduled workflows on a public repo are disabled after 60 days without activity. If the charts stop updating, open the Actions tab and re-enable the workflow.
- **Token expiration**: if the PAT expires, the workflow fails. Generate a new token and replace the `GH_STATS_TOKEN` secret.

## What the charts count

The data comes from GitHub's GraphQL API (`contributionsCollection`), so the rules are the same as for your profile's contribution graph:

- Only commits on the **default branch** (or `gh-pages`) count. Commits on a working branch appear after the merge.
- The commit email must be **linked to your GitHub account** (Settings → Emails).
- Days are computed in **UTC**: a late-evening commit can land on the next day.
- A **streak** counts days with at least one contribution (commit, PR, issue or review). The current day does not break the streak until it is over.

## Customization

Settings are adjusted with `env` variables in the workflow:

| Variable | Step | Default | Purpose |
|---|---|---|---|
| `DAYS` | Commit activity graph | `30` | Number of days shown in the curve. |
| `TOP_LANGS` | Languages, Recent languages | `8` | Number of languages displayed. |
| `EXCLUDE_LANGS` | Languages, Recent languages | empty | Languages to ignore, comma-separated (for example `Jupyter Notebook,HTML`). Set it in each step concerned. |
| `RECENT_DAYS` | Recent languages | `90` | Length of the "recent" window, in days (maximum 365). |

The colors (`react-dark` theme) are defined at the top of `scripts/lib.mjs`, in the `C` object. The chart texts are in English and can be edited directly in the scripts.

## Test locally

You need Node.js 20 or later, with no package to install:

```bash
export GH_TOKEN=ghp_xxx          # your PAT
export GH_USERNAME=your-username
node scripts/generate-graph.mjs
node scripts/generate-stats.mjs
node scripts/generate-languages.mjs
node scripts/generate-recent-languages.mjs
```

The files are written to `dist/`.

## Repo structure

```
github-tools/
├── .github/workflows/update-graph.yml
├── scripts/
│   ├── lib.mjs
│   ├── generate-graph.mjs
│   ├── generate-stats.mjs
│   ├── generate-languages.mjs
│   └── generate-recent-languages.mjs
├── dist/                    ← generated automatically
└── README.md
```
