// https://yumbrands.atlassian.net/issues/?filter=10897
import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import sheet from "./steerco-reporting.css" assert {type: 'css'};

import {howMuchHasDueDateMovedForwardChangedSince, DAY_IN_MS, FOUR_WEEKS_AGO} from "./date-helpers.js";
import semver from "./semver.js";

const dateFormatter = new Intl.DateTimeFormat('en-US', {dateStyle: "short"})

import "./steerco-timeline.js";

const ISSUE_KEY = "Issue key";
const PRODUCT_TARGET_RELEASE_KEY = "Product Target Release";
const ISSUE_TYPE_KEY = "Issue Type";
const PARENT_LINK_KEY = "Parent Link";
const START_DATE_KEY = "Start date";
const DUE_DATE_KEY = "Due date";
const LABELS_KEY = "Labels";
const STATUS_KEY = "Status";

document.adoptedStyleSheets = [sheet];

export class SteercoReporter extends StacheElement {
  static view = `
					{{# if(this.releases) }}
						<steerco-timeline releases:from="this.releasesAndNext"/>
						<table>
							<thead>
								<tr>
									<th>Release Number</th>
									<th>Initiatives</th>
									<th>Dev Complete</th>
									<th>QA Complete</th>
									<th>UAT Complete</th>
								</tr>
							</thead>
							<tbody>
								{{# for(release of this.releasesAndNext) }}
									<tr>
										<td>{{release.release}}</td>
										<td><ul>{{# for(initiative of release.initiatives) }}
												<li>{{initiative.Summary}}</li>
												{{/ for}}</ul>
										</td>
										<td>{{this.prettyDate(release.lastDev)}}</td>
										<td>{{this.prettyDate(release.lastQa)}}</td>
										<td>{{this.prettyDate(release.lastUat)}}</td>
									</tr>
								{{/ for }}
							</tbody>
						</table>

					{{ else }}
						Loading ...
					{{/ if}}

  `;
  static props = {
    uploadUrl: {
      get default(){
        return localStorage.getItem("csv-url") || "";
      },
      set(newVal) {
        localStorage.setItem("csv-url", newVal);
        return newVal;
      }
    },
		jql: {
			type: String,
			default: `(issuekey in portfolioChildIssuesOf(YUMPOS-266)  OR labels in (TB_US_POS) ) and issueType in (Initiatives, Epic) ORDER BY issuetype DESC`
		}
  };
  // hooks
  async connected() {

		if(this.jql) {

			const issues = await this.jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
				jql: this.jql,
				fields: ["summary",
						"Start date",
						"Due date",
						"Issue Type",
						"Fix versions",
						"Product Target Release", PARENT_LINK_KEY, LABELS_KEY, STATUS_KEY ],
				expand: ["changelog"]
			});
			// clean up from excell
			const rawIssues = toCVSFormat(issues)
			console.log(rawIssues);
			this.rawIssues = rawIssues;

		}

  }

  drawSlide(results) {
		this.rawIssues = makeObjectsFromRows(results.data);
  }
	get releases(){
		if(!this.rawIssues) {
			return undefined;
		}

		const releasesToInitiatives = mapReleasesToIssues(filterReleases(filterOutStatuses(filterInitiatives(this.rawIssues), ["Done", "Partner Review"])));

		const sortedReleases = semverSort(Object.keys(releasesToInitiatives));


		const issueMap = makeIssueMap(this.rawIssues);

		return sortedReleases.map( release => {
			const releaseData = {
				release: release,
				initiatives: releasesToInitiatives[release].map( initiative => {
					const epics = getChildrenOf(initiative, issueMap);

					return {
						...initiative,
						//...goodStuffFromIssue(initiative),
						dev: sortByStartDate( filterPOSWork(epics) )[0],
						qa: filterQAWork(epics)[0],
						uat: filterPartnerReviewWork(epics)[0]
					}
				})
			};

			releaseData.firstDev = getFirstDateFrom(releaseData.initiatives,"dev") || new Date();
			releaseData.lastDev = getLastDateFrom(releaseData.initiatives,"dev");
			releaseData.lastQa = getLastDateFrom(releaseData.initiatives,"qa");
			releaseData.lastUat = getLastDateFrom(releaseData.initiatives,"uat");

			releaseData.lastDevWas = getDateFromLastPeriod(releaseData.initiatives,"dev", FOUR_WEEKS_AGO);
			releaseData.lastQaWas = getDateFromLastPeriod(releaseData.initiatives,"qa", FOUR_WEEKS_AGO)
			releaseData.lastUatWas = getDateFromLastPeriod(releaseData.initiatives,"uat", FOUR_WEEKS_AGO)

			return releaseData;

		})
	}
	get releasesAndNext(){
		if(this.releases) {
			let releasesAndNext = [
				...this.releases,
				{
					release: "Next",
					initiatives: sortReadyFirst(filterPlanningAndReady(filterOutReleases(filterInitiatives(this.rawIssues))))
				}];
			return releasesAndNext;
		}
	}

	prettyDate(date){
		return dateFormatter.format(date);
	}

}



customElements.define("steerco-reporter", SteercoReporter);



function filterByIssueType(issues, issueType) {
	return issues.filter( issue => issue[ISSUE_TYPE_KEY] === issueType)
}

function filterInitiatives(issues) {
	return filterByIssueType(issues, "Initiatives")
}

function goodStuffFromIssue(issue) {
	return {
		Summary: issue.Summary,
		[ISSUE_KEY]: issue[ISSUE_KEY],
	}
}

function filterReleases(issues){
	return issues.filter( issue => issue[PRODUCT_TARGET_RELEASE_KEY])
}

function filterOutReleases(issues){
	return issues.filter( issue => !issue[PRODUCT_TARGET_RELEASE_KEY])
}
function filterPlanningAndReady(issues){
	return issues.filter( issue => ["Ready","Planning"].includes(issue.Status))
}
function filterOutStatuses(issues, statuses) {
	return issues.filter( issue => !statuses.includes(issue.Status))
}

function mapReleasesToIssues(issues) {
	const map = {};
	issues.forEach((issue) => {
		const release = issue[PRODUCT_TARGET_RELEASE_KEY]
		if(!map[release]) {
			map[release] = [];
		}
		map[release].push(issue);
	})
	return map;
}

function semverSort(values) {
	const cleanMap = {};
	const cleanValues = [];
	values.forEach( (release) => {
		const clean = release.replace(/^[^\d]+/,"").replace(".X",".0");
		if( semver.clean(clean) ){
			cleanMap[clean] = release;
			cleanValues.push(clean);
		}

	});
	const cleanSorted = semver.sort(cleanValues);
	return cleanSorted.map( clean => cleanMap[clean]);
}

function makeIssueMap(issues) {
	if(typeof issues === "object" && !Array.isArray(issues)) {
		return issues;
	}
	const map = {};
	issues.forEach( i => {
		map[i[ISSUE_KEY]] = i;
	})
	return map;
}

function getChildrenOf(issue, issuesOrIssueMap) {
	const children = [];
	const issueMap = makeIssueMap(issuesOrIssueMap);

	for(let issueKey in issueMap) {
		let possibleChild = issueMap[issueKey];
		if(possibleChild[PARENT_LINK_KEY] === issue[ISSUE_KEY]) {
			children.push(possibleChild);
		}
	}
	return children;
}

function filterByLabel(issues,label){
	return issues.filter( issue => issue[LABELS_KEY].includes(label))
}
function filterQAWork(issues) {
	return filterByLabel(issues, "POS_QA")
}
function filterPOSWork(issues) {
	return filterByLabel(issues, "POS_WORK")
}
function filterPartnerReviewWork(issues) {
	return filterByLabel(issues, "TB_UAT")
}
function sortByStartDate(issues) {
	return issues.sort((issueA, issueB) => {
		const dateA = Date.parse(issueA[START_DATE_KEY]),
			dateB = Date.parse(issueB[START_DATE_KEY]);
		return dateA - dateB;
	})
}

function getLastDateFrom(initiatives, property) {
	const values = initiatives.filter(
		init => init[property]
	).map( init => Date.parse(init[property][DUE_DATE_KEY]))
	.filter( (number) => !isNaN(number) );
	return values.length ? new Date(Math.max(...values)) : undefined;
}
function getDateFromLastPeriod(initiatives, lowercasePhase, checkpoint) {
	const dates = initiatives.map( initiative => {
		if(initiative[lowercasePhase]) {
			const {dueDateWasPriorToTheFirstChangeAfterTheCheckpoint}
				= howMuchHasDueDateMovedForwardChangedSince(initiative[lowercasePhase], checkpoint);
			return dueDateWasPriorToTheFirstChangeAfterTheCheckpoint;
		}
	}).filter( d => d) // remove undefineds

	const date = Math.max(...dates);
	return new Date(date);
}



function getFirstDateFrom(initiatives, property) {
	const values = initiatives.filter(
		init => init[property] && init[property][START_DATE_KEY]
	).map( init => Date.parse(init[property][START_DATE_KEY]));
	return values.length ? new Date(Math.min(...values)) : undefined;
}

function sortReadyFirst(initiatives) {
	return initiatives.sort( (a, b) => {
		console.log(a.Status)
		if(a.Status === "Ready") {
			return -1;
		}
		return 1;
	})
}

function toCVSFormat(issues){
	return issues.map( issue => {
		return {
			...issue.fields,
			changelog: issue.changelog,
			[ISSUE_KEY]: issue.key,
			[ISSUE_TYPE_KEY]: issue.fields[ISSUE_TYPE_KEY].name,
			[PRODUCT_TARGET_RELEASE_KEY]: issue.fields[PRODUCT_TARGET_RELEASE_KEY]?.[0],
			[PARENT_LINK_KEY]: issue.fields[PARENT_LINK_KEY]?.data?.key,
			[STATUS_KEY]: issue.fields[STATUS_KEY]?.name
		}
	})
}
