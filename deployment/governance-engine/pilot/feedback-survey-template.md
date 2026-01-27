# Governance Engine Feedback Surveys

Survey templates for collecting feedback during and after the pilot.

## Pre-Pilot Survey

**Purpose**: Establish baseline understanding and expectations

**Distribution**: 1 week before pilot starts

**Estimated Time**: 5 minutes

---

### Pre-Pilot Survey Questions

**Section 1: Background**

1. **What is your role?**
   - [ ] Junior Engineer
   - [ ] Mid-level Engineer
   - [ ] Senior Engineer
   - [ ] Tech Lead
   - [ ] Engineering Manager

2. **How long have you been on your current team?**
   - [ ] < 3 months
   - [ ] 3-6 months
   - [ ] 6-12 months
   - [ ] 1-2 years
   - [ ] 2+ years

3. **How many commits do you typically make per week?**
   - [ ] 1-5
   - [ ] 6-10
   - [ ] 11-20
   - [ ] 20+

**Section 2: Current Practices**

4. **How does your team ensure code quality today?** (Select all that apply)
   - [ ] Code reviews
   - [ ] Linting (ESLint, etc.)
   - [ ] Type checking (TypeScript strict mode)
   - [ ] Unit tests
   - [ ] Integration tests
   - [ ] Manual testing
   - [ ] Security scanning
   - [ ] Other: ___________

5. **How often do quality issues slip through to production?**
   - [ ] Never
   - [ ] Rarely (< once per month)
   - [ ] Sometimes (1-2 per month)
   - [ ] Often (weekly)
   - [ ] Very often (multiple per week)

6. **What are your biggest code quality pain points?** (Select top 3)
   - [ ] Inconsistent coding standards
   - [ ] Security vulnerabilities
   - [ ] Missing tests
   - [ ] Architectural violations
   - [ ] Code complexity
   - [ ] Missing documentation
   - [ ] Technical debt
   - [ ] Other: ___________

**Section 3: Expectations**

7. **Have you used automated governance/policy tools before?**
   - [ ] Yes, extensively
   - [ ] Yes, briefly
   - [ ] No, but I've heard of them
   - [ ] No, this is new to me

8. **How do you feel about automated code governance?** (1-10 scale)
   - 1 = Very negative, will slow us down
   - 10 = Very positive, will help us improve
   - Rating: ___

9. **What concerns do you have about the governance engine?** (Select all that apply)
   - [ ] Will slow down development
   - [ ] False positives blocking work
   - [ ] Too rigid/inflexible
   - [ ] Hard to learn
   - [ ] Not relevant to my work
   - [ ] Will find too many issues
   - [ ] Other: ___________

10. **What would make the pilot a success for you?**
    - (Open text)

---

## Week 1 Survey (Mid-Pilot)

**Purpose**: Assess initial experience and identify early issues

**Distribution**: Friday of Week 1

**Estimated Time**: 10 minutes

---

### Week 1 Survey Questions

**Section 1: Installation**

1. **How easy was the installation process?** (1-10 scale)
   - 1 = Very difficult, needed lots of help
   - 10 = Very easy, worked perfectly
   - Rating: ___

2. **How long did installation take?**
   - [ ] < 5 minutes
   - [ ] 5-15 minutes
   - [ ] 15-30 minutes
   - [ ] 30-60 minutes
   - [ ] > 1 hour

3. **Did you encounter any installation issues?**
   - [ ] No issues
   - [ ] Minor issues (resolved quickly)
   - [ ] Moderate issues (took some time)
   - [ ] Major issues (needed significant help)

4. **If you had issues, what were they?**
   - (Open text)

**Section 2: First Week Usage**

5. **How many commits did you make this week?**
   - [ ] 0-5
   - [ ] 6-10
   - [ ] 11-20
   - [ ] 20+

6. **How many violations did governance find?**
   - [ ] 0-5
   - [ ] 6-10
   - [ ] 11-20
   - [ ] 21-50
   - [ ] 50+

7. **How many violations were legitimate issues?**
   - [ ] All of them
   - [ ] Most (> 80%)
   - [ ] About half
   - [ ] Few (< 20%)
   - [ ] None

8. **How many were false positives?**
   - [ ] None
   - [ ] Few (< 20%)
   - [ ] About half
   - [ ] Most (> 80%)
   - [ ] All of them

9. **How clear were the error messages?** (1-10 scale)
   - 1 = Very confusing
   - 10 = Very clear and actionable
   - Rating: ___

10. **How helpful were the suggested fixes?** (1-10 scale)
    - 1 = Not helpful at all
    - 10 = Exactly what I needed
    - Rating: ___

**Section 3: Value**

11. **Did governance catch any real issues?**
    - [ ] Yes, multiple serious issues
    - [ ] Yes, a few issues
    - [ ] Yes, but minor issues only
    - [ ] No real issues found

12. **If yes, what types of issues?** (Select all that apply)
    - [ ] Security vulnerabilities
    - [ ] Missing tests
    - [ ] Architecture violations
    - [ ] Code quality issues
    - [ ] Documentation gaps
    - [ ] Other: ___________

13. **How is governance affecting your workflow?**
    - [ ] Very positive impact
    - [ ] Somewhat positive
    - [ ] No real impact
    - [ ] Somewhat negative
    - [ ] Very negative impact

14. **What's working well?**
    - (Open text)

15. **What needs improvement?**
    - (Open text)

**Section 4: Week 2 Readiness**

16. **Are you ready for blocking mode in Week 2?**
    - [ ] Yes, bring it on!
    - [ ] Yes, with some concerns
    - [ ] Not sure yet
    - [ ] No, need more time
    - [ ] No, major issues need fixing first

17. **What concerns do you have about blocking mode?**
    - (Open text)

---

## Final Survey (Post-Pilot)

**Purpose**: Comprehensive assessment of pilot experience

**Distribution**: Friday of Week 2

**Estimated Time**: 15 minutes

---

### Final Survey Questions

**Section 1: Overall Experience**

1. **How would you rate your overall pilot experience?** (1-10 scale)
   - 1 = Very negative
   - 10 = Very positive
   - Rating: ___

2. **Did the governance engine meet your expectations?**
   - [ ] Exceeded expectations
   - [ ] Met expectations
   - [ ] Somewhat below expectations
   - [ ] Well below expectations

3. **How much value did governance provide?** (1-10 scale)
   - 1 = No value
   - 10 = Extremely valuable
   - Rating: ___

**Section 2: Technical Assessment**

4. **How was the performance?** (1-10 scale)
   - 1 = Unacceptably slow
   - 10 = Fast, no noticeable impact
   - Rating: ___

5. **Average time per check?**
   - [ ] < 5 seconds
   - [ ] 5-10 seconds
   - [ ] 10-20 seconds
   - [ ] 20-30 seconds
   - [ ] > 30 seconds

6. **Did performance impact your productivity?**
   - [ ] No impact
   - [ ] Minimal impact
   - [ ] Moderate impact
   - [ ] Significant impact

7. **How stable was the tool?**
   - [ ] No issues, worked perfectly
   - [ ] Minor issues, easily resolved
   - [ ] Some bugs but manageable
   - [ ] Frequent issues
   - [ ] Unstable, blocked work

**Section 3: Policy Assessment**

8. **Was the policy too strict, too lenient, or about right?**
   - [ ] Way too strict
   - [ ] Somewhat too strict
   - [ ] About right
   - [ ] Somewhat too lenient
   - [ ] Way too lenient

9. **What percentage of violations were false positives?**
   - [ ] 0-5%
   - [ ] 5-10%
   - [ ] 10-20%
   - [ ] 20-50%
   - [ ] > 50%

10. **Which policy areas need adjustment?** (Select all that apply)
    - [ ] Security rules (too strict/lenient)
    - [ ] Test coverage requirements
    - [ ] Architecture rules
    - [ ] Code quality thresholds
    - [ ] Documentation requirements
    - [ ] None, policy is good
    - [ ] Other: ___________

**Section 4: Impact**

11. **How many times did you bypass governance checks?**
    - [ ] Never
    - [ ] 1-2 times
    - [ ] 3-5 times
    - [ ] 6-10 times
    - [ ] > 10 times

12. **Why did you bypass?** (If applicable)
    - [ ] False positive
    - [ ] Emergency hotfix
    - [ ] Disagreed with rule
    - [ ] Too hard to fix
    - [ ] Other: ___________

13. **Did governance catch any security issues?**
    - [ ] Yes, critical issues
    - [ ] Yes, important issues
    - [ ] Yes, minor issues
    - [ ] No security issues

14. **Did it improve code quality?**
    - [ ] Yes, significantly
    - [ ] Yes, somewhat
    - [ ] No real change
    - [ ] No, made it worse

15. **Did it help you learn best practices?**
    - [ ] Yes, learned a lot
    - [ ] Yes, learned some things
    - [ ] Not really
    - [ ] No

**Section 5: Support**

16. **How was the support during the pilot?** (1-10 scale)
    - 1 = Poor, couldn't get help
    - 10 = Excellent, very responsive
    - Rating: ___

17. **How quickly were issues resolved?**
    - [ ] Immediately (< 1 hour)
    - [ ] Same day
    - [ ] Next day
    - [ ] Within a week
    - [ ] Not resolved

18. **Was documentation helpful?**
    - [ ] Very helpful
    - [ ] Somewhat helpful
    - [ ] Not very helpful
    - [ ] Didn't use it

**Section 6: Recommendation**

19. **Would you recommend governance to other teams?**
    - [ ] Definitely yes
    - [ ] Probably yes
    - [ ] Not sure
    - [ ] Probably no
    - [ ] Definitely no

20. **Why or why not?**
    - (Open text)

21. **Do you want to continue using governance?**
    - [ ] Yes, absolutely
    - [ ] Yes, with improvements
    - [ ] Undecided
    - [ ] Probably not
    - [ ] Definitely not

22. **What would make you more likely to recommend it?**
    - (Open text)

**Section 7: Improvements**

23. **What should we improve before wider rollout?** (Select top 3)
    - [ ] Performance
    - [ ] Error messages
    - [ ] Policy rules
    - [ ] Documentation
    - [ ] Installation process
    - [ ] Support
    - [ ] False positive rate
    - [ ] Other: ___________

24. **What features would you like to see?**
    - (Open text)

25. **Any other feedback or comments?**
    - (Open text)

---

## Follow-Up Survey (1 Month Later)

**Purpose**: Assess long-term impact and sustained usage

**Distribution**: 1 month after pilot ends

**Estimated Time**: 5 minutes

---

### Follow-Up Survey Questions

1. **Are you still using the governance engine?**
   - [ ] Yes, actively
   - [ ] Yes, but less than before
   - [ ] No, stopped using it

2. **If no, why not?**
   - (Open text)

3. **How has governance impacted your team over the past month?**
   - [ ] Very positive impact
   - [ ] Somewhat positive
   - [ ] No impact
   - [ ] Somewhat negative
   - [ ] Very negative

4. **Has your opinion changed since the pilot?**
   - [ ] More positive now
   - [ ] About the same
   - [ ] More negative now

5. **What benefits have you seen?**
   - (Open text)

6. **What challenges remain?**
   - (Open text)

7. **Would you still recommend it?**
   - [ ] Yes
   - [ ] No
   - [ ] Unsure

---

## Analysis Guidelines

### Quantitative Analysis

**Scoring**:
- Calculate average for all rating questions
- Track distribution of responses
- Compare Week 1 vs Final survey
- Identify trends

**Key Metrics**:
- Overall satisfaction (Q1, Final Survey)
- Perceived value (Q3, Final Survey)
- Recommendation rate (Q19, Final Survey)
- False positive rate (Q9, Final Survey)

**Thresholds**:
- Satisfaction > 7/10 = Success
- Value > 7/10 = Success
- Recommendation > 70% = Success
- False positive < 10% = Success

### Qualitative Analysis

**Coding**:
- Read all open-ended responses
- Identify themes
- Categorize feedback
- Count frequency

**Common Themes to Look For**:
- Performance issues
- Specific policy complaints
- Documentation gaps
- Support quality
- Learning curve
- Value provided

### Red Flags

**Stop and address if**:
- Average satisfaction < 5/10
- Recommendation rate < 50%
- False positive rate > 20%
- Multiple reports of same issue
- Support rated < 5/10

### Reporting

**Summary Report Should Include**:
1. Executive summary (1 page)
2. Quantitative results (charts/graphs)
3. Key themes from open responses
4. Top 5 positives
5. Top 5 improvements needed
6. Recommendation (GO/NO-GO)
7. Action items

---

## Survey Distribution

### Tools

**Recommended**:
- Google Forms (free, easy)
- Typeform (better UX)
- SurveyMonkey (advanced features)
- Internal survey tool

**Requirements**:
- Anonymous responses
- Export to CSV
- Easy to complete
- Mobile-friendly

### Communication

**Pre-Pilot Survey**:
```
Subject: Quick Survey Before Governance Pilot

Hi [Name],

You're part of the governance engine pilot starting Monday!

Please take 5 minutes to complete this pre-pilot survey:
[SURVEY LINK]

This helps us understand your expectations and concerns.

Thanks!
[Sender]
```

**Mid-Pilot Survey**:
```
Subject: Week 1 Feedback - Governance Pilot

Hi pilot teams!

Week 1 complete! We'd love your feedback.

Please take 10 minutes to complete this survey:
[SURVEY LINK]

Your input directly influences Week 2 and future rollout.

Deadline: Monday morning
Incentive: $25 gift card for completion!

Thanks!
```

**Final Survey**:
```
Subject: Final Pilot Feedback - Your Input Matters!

Hi pilot teams!

Pilot complete! 🎉

Please share your final thoughts:
[SURVEY LINK]

This is the most important survey - determines if we roll out to all teams.

Deadline: Next Friday
Incentive: $50 gift card + recognition in all-hands!

Thanks for being pioneers!
```

### Incentives

**Considerations**:
- Gift cards ($25-50)
- Extra PTO (4 hours)
- Team lunch
- Public recognition
- Early access to new features

**Requirements**:
- Approved by management
- Fair to all participants
- Meaningful value
- Easy to fulfill

---

**Surveys are crucial for pilot success. Thoughtful questions + high response rate = actionable insights.** 📊
