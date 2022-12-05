mainElement.textContent = "Getting stories";
const issues = await jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelog({
	jql: `project = "YUMPOS" and "Actual Release[Labels]" in (4.0.0) and issueType not in (Initiatives, Epic)`,
	fields: ["summary",STORY_POINTS_FIELD],
	expand: ["changelog"]
})

console.log(issues);

//const issue = await jiraHelpers.fetchJiraIssueChangelog("YUMPOS-985");
const issueResults = issues.map( (issue) => {
	return {
		summary: issue.fields.summary,
		storyPoints: issue.fields[STORY_POINTS_FIELD],
		//changeLogComplete: isChangelogComplete(issue.changelog),
		inDevDays: calculateTimeInStatus(issue.changelog) / (1000*60*60*24)
	}
})
console.table(issueResults)
