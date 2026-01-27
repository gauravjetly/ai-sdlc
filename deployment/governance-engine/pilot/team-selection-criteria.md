# Pilot Team Selection Criteria

Guidelines for selecting teams for the Governance Engine pilot program.

## Selection Criteria

### Essential Requirements

#### 1. Team Characteristics

**Team Size**: 5-10 developers
- Large enough to provide meaningful data
- Small enough to provide individualized support
- Mix of experience levels (junior, mid, senior)

**Project Activity**: Active development
- Daily commits (minimum 10-15/week)
- Active pull requests
- Regular deploys
- Not maintenance mode

**Technical Stack**: Representative
- Uses primary company technologies
- TypeScript/JavaScript preferred
- Mix of frontend and backend
- Has tests (or should have)

**Team Stability**: Established team
- Team has been together > 3 months
- Not undergoing reorganization
- Stable project roadmap
- Committed team lead

#### 2. Team Attitude

**Willingness to Experiment**: Open to new tools
- ✅ "Let's try it and see"
- ✅ "How can we make this better?"
- ❌ "This will never work"
- ❌ "We're too busy for this"

**Feedback Culture**: Provides constructive input
- Willing to attend retrospectives
- Comfortable giving honest feedback
- Suggests improvements
- Documents issues clearly

**Technical Aptitude**: Can troubleshoot
- Comfortable with command line
- Can read error messages
- Willing to debug issues
- Helps validate solutions

#### 3. Project Suitability

**Code Quality**: Room for improvement
- Has some technical debt
- Could benefit from governance
- Not perfect (unrealistic) or disaster (overwhelming)
- Representative of typical projects

**Architecture**: Clear structure
- Follows (or should follow) layered architecture
- Has identifiable components
- Not legacy spaghetti code
- Good learning example

**Testing**: Has some tests
- Existing test infrastructure
- Room to improve coverage
- Tests run in CI
- Team values testing

#### 4. Strategic Value

**Visibility**: Other teams watch them
- Respected team in organization
- Other teams follow their lead
- Can influence adoption
- Good ambassadors

**Business Impact**: Important but not critical
- Valuable to business
- But can tolerate some disruption
- Not on critical path for major initiative
- Flexible timeline

**Learning Opportunity**: Will generate insights
- Diverse use cases
- Representative challenges
- Will surface edge cases
- Good test of policies

### Scoring Rubric

Score each criterion 1-5 (5 = excellent, 1 = poor)

| Criterion | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Team size and composition | 1x | ___ | ___ |
| Project activity level | 2x | ___ | ___ |
| Technical stack fit | 2x | ___ | ___ |
| Team stability | 1x | ___ | ___ |
| Willingness to experiment | 3x | ___ | ___ |
| Feedback culture | 2x | ___ | ___ |
| Technical aptitude | 2x | ___ | ___ |
| Code quality (room to improve) | 1x | ___ | ___ |
| Architecture clarity | 2x | ___ | ___ |
| Testing maturity | 2x | ___ | ___ |
| Team visibility/influence | 2x | ___ | ___ |
| Business impact (important not critical) | 1x | ___ | ___ |
| Learning potential | 2x | ___ | ___ |
| **TOTAL** | | | **___** |

**Scoring Guide**:
- 60-75: Excellent pilot candidate
- 45-59: Good pilot candidate
- 30-44: Acceptable with caveats
- <30: Not recommended

### Red Flags (Disqualifiers)

❌ **Team is underwater**: Behind schedule, fire fighting
- They won't have bandwidth for pilot
- Will resent the additional burden
- Won't provide thoughtful feedback

❌ **Team lead is skeptical**: Doesn't believe in governance
- Will subtly sabotage adoption
- Team will pick up on negativity
- Better to find advocates

❌ **Project is legacy/deprecated**: About to be replaced
- Won't invest time learning
- Not representative of future
- Limited learning value

❌ **Team is too small**: < 3 developers
- Not enough data points
- Single person can skew results
- Limited diversity of use cases

❌ **Project is critical with tight deadline**: Launch in < 1 month
- Can't risk any disruption
- Team has no bandwidth
- Too stressful to experiment

❌ **Team has extreme turnover**: > 50% new in last month
- Too much other learning happening
- Unstable to provide feedback
- Won't stay for full pilot

## Ideal Pilot Team Profiles

### Profile 1: "The Enthusiasts"

**Characteristics**:
- Early adopters of new tools
- Active in tech community
- Strong engineering culture
- Love automation

**Why They're Great**:
- Will push boundaries
- Find edge cases
- Provide detailed feedback
- Become champions

**Potential Issues**:
- May not represent typical team
- Might have higher tolerance for issues
- Could overestimate ease of adoption

**Best For**: Phase 1 (initial pilot)

### Profile 2: "The Pragmatists"

**Characteristics**:
- Focus on productivity
- Want tools that work
- Balanced approach
- Will be honest about problems

**Why They're Great**:
- Realistic feedback
- Represent average team
- Will surface real issues
- Honest about what works

**Potential Issues**:
- May push back on complexity
- Need clear value proposition
- Less patient with bugs

**Best For**: Phase 1 (second pilot team)

### Profile 3: "The Skeptics (Friendly)"

**Characteristics**:
- Question new tools
- Want to see proof
- Need convincing
- But open-minded

**Why They're Great**:
- Stress-test value proposition
- Find weak points in approach
- Represent cautious teams
- Conversion is powerful signal

**Potential Issues**:
- Need extra support
- May require more communication
- Could withdraw if bad experience

**Best For**: Phase 2 (early adopters)

## Team Identification Process

### Step 1: Create Candidate List

**Sources**:
- Engineering manager recommendations
- Teams that use best practices
- Teams with quality issues (that want to improve)
- Volunteers (after all-hands announcement)

**Initial List**: 10-15 candidate teams

### Step 2: Evaluate Against Criteria

**Process**:
1. Score each team using rubric above
2. Interview team lead (15 minutes)
3. Review recent PRs and code
4. Check team's delivery cadence
5. Validate with engineering manager

**Questions for Team Lead**:
1. How would you describe your team's attitude toward new tools?
2. What are your current pain points in development process?
3. How do you ensure code quality today?
4. Would your team have bandwidth for a 2-week pilot?
5. How do you handle feedback and retrospectives?
6. What concerns do you have about governance enforcement?

### Step 3: Shortlist

**Select**: 3-4 teams (for 2 pilot slots + backups)

**Review with**:
- VP Engineering (strategic fit)
- Engineering Managers (team readiness)
- Product (business impact)

### Step 4: Invite

**Invitation Email Template**:
```
Subject: Invitation to Governance Engine Pilot Program

Hi [Team Lead],

Your team has been selected to participate in the Governance Engine pilot program!

Why your team?
[Specific reasons based on their strengths]

What's involved?
- 2-week pilot (starting [DATE])
- Install governance on your projects
- Provide feedback via surveys and retrospectives
- ~2 hours total time commitment

What you get?
- Dedicated support (Slack + office hours)
- Early influence on policies
- Recognition as pilot team
- First access to new features

Interested? Let's schedule a 15-minute call to discuss details.

[Link to schedule]

Thanks,
[Sender]
```

### Step 5: Confirm

**Before finalizing**:
- [ ] Team lead confirms team is interested
- [ ] Engineering manager approves
- [ ] Team has bandwidth
- [ ] Projects are good fit
- [ ] Timeline works for team

## Diversity Considerations

### Strive for Diversity Across:

**Project Types**:
- Frontend (UI-heavy)
- Backend (API-heavy)
- Full-stack
- Data/ML
- Infrastructure/Platform

**Team Locations**:
- Different offices
- Remote teams
- Different time zones
- Various team sizes

**Technology**:
- TypeScript
- JavaScript
- React vs Angular vs Vue
- Node.js vs other backends

**Experience Levels**:
- Senior-heavy teams
- Balanced teams
- Junior-heavy teams

**Current Practices**:
- Strong testing culture
- Improving testing culture
- Minimal testing culture

## Backup Plans

### If Pilot Team Drops Out

**Have 1-2 backup teams**:
- Already evaluated
- Ready to start quickly
- Can swap in within 1 day

### If Pilot Goes Poorly

**Rapid Response**:
1. Immediate meeting with team
2. Identify specific issues
3. Provide workarounds or policy adjustments
4. Decide: continue with fixes or pause

**Communication**:
- Transparent about issues
- Show rapid response to feedback
- Demonstrate commitment to success

## Post-Selection

### Pilot Kickoff Package

Send to selected teams:
- [ ] Welcome email with timeline
- [ ] Installation guide
- [ ] Policy overview
- [ ] Support contact info
- [ ] Calendar invites for retrospectives
- [ ] Slack channel invite

### Set Expectations

**Communicate Clearly**:
- Time commitment (realistic)
- What we're testing (governance approach)
- What we need from them (honest feedback)
- How we'll support them (dedicated help)
- What happens after pilot (rollout plan)

**Success Looks Like**:
- Teams successfully install and use governance
- We identify and fix major issues
- We refine policies based on feedback
- Teams provide honest, constructive feedback
- We have confidence to proceed to Phase 2

---

## Selection Checklist

- [ ] Created candidate list (10-15 teams)
- [ ] Scored all candidates using rubric
- [ ] Interviewed top 5 team leads
- [ ] Reviewed code and practices
- [ ] Confirmed bandwidth and interest
- [ ] Selected 2 pilot teams + 2 backups
- [ ] Got VP and EM approvals
- [ ] Invited pilot teams
- [ ] Received confirmations
- [ ] Sent kickoff packages
- [ ] Scheduled retrospectives

---

**Remember**: Pilot team selection is critical to success. Take time to choose wisely. A good pilot team will provide invaluable feedback and become champions for adoption.
