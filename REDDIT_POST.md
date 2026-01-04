# I Spent 3 Months Building a Pricing App with Claude - Here's What "Vibe Coding" Actually Looks Like

Everyone says AI will let you build a SaaS in a week. **This took 3 months.** But what would've been 12-18 months traditionally.

## What I Built
AutoMerchant - AI pricing optimizer for Shopify. Analyzes products every 30min, recommends price changes.
**Stack:** React, Node, PostgreSQL, Shopify API

## The Reality
Prompt: *"Build a pricing optimizer for Shopify"*
Result: Empty Express server. No auth, no database, no algorithm.
**Weeks 1-2:** Database schema (15+ revisions)
**Weeks 3-7:** Claude wrote 475 lines of Bayesian statistics (Expected Value of Information, regret budgets, elasticity learning). Math I couldn't write.
**Weeks 8-12:** Security, deployment, bugs

## Week 9 Cron Bug
Auto-analysis broke:
- Rate limit 20min, cron runs every 30min
- `global.lastCronRun` doesn't persist in serverless
- CRON_SECRET had trailing whitespace
Claude diagnosed it, created database table for persistent rate limiting. **2 days of back-and-forth.**

## What Actually Takes Time
- Shopify OAuth: 15+ iterations
- Security: 15 vulnerabilities, full week
- Hallucinations: Fake endpoints, wrong signatures
Every time: debug, understand, re-prompt.

## The Reality
**Traditional:** Bayesian distribution = 6-8 hours
**With Claude:** 3 hours (writes in 2min, I spend 3hrs understanding + testing)
3-4x faster. **But you still architect, debug, deploy.**

Agentic coding = 3-4x multiplier, not magic.

---

**Time:** 3 months
**Code:** ~5,000 lines (reviewed all, wrote few)

Landing page: https://automerchant.vercel.app/
