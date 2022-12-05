// https://yumbrands.atlassian.net/issues/?filter=10897
import { StacheElement, type, ObservableObject } from "//unpkg.com/can@6/core.mjs";
import sheet from "./steerco-reporting.css" assert {type: 'css'};

import {howMuchHasDueDateMovedForwardChangedSince, DAY_IN_MS, FOUR_WEEKS_AGO} from "./date-helpers.js";
import semver from "./semver.js";

import {addStatusToInitiative, addStatusToEpic, addStatusToRelease, getBusinessDatesCount} from "./status-helpers.js";
import "./capacity-planning.js";

const dateFormatter = new Intl.DateTimeFormat('en-US', {dateStyle: "short"});

import {estimateExtraPoints} from "./confidence.js";

import "./steerco-timeline.js";

const ISSUE_KEY = "Issue key";
const PRODUCT_TARGET_RELEASE_KEY = "Product Target Release";
const ISSUE_TYPE_KEY = "Issue Type";
const PARENT_LINK_KEY = "Parent Link";
const START_DATE_KEY = "Start date";
const DUE_DATE_KEY = "Due date";
const LABELS_KEY = "Labels";
const STATUS_KEY = "Status";
const FIX_VERSIONS_KEY = "Fix versions";

document.adoptedStyleSheets = [sheet];

export class SteercoReporter extends StacheElement {
  static view = `
					<h1>Release Report</h1>
					<p>Presenting <input value:from='this.jql'/></p>

					{{# if(this.releases) }}
						<capacity-planning rawIssues:from="this.rawIssues"/>

						<h2>Timeline</h2>
						<steerco-timeline releases:from="this.releases"/>

						<h2>Release Breakdown</h2>
						{{# for(release of this.releasesAndNext) }}
							<h2>{{release.release}}</h2>
							<table class='basic-table'>
								<thead>
								<tr><th>Sequence</th>
										<th>Start</th>
										<th>Due</th>
										<th>Due last period</th>
										<th>Working days</th>
										<th>Story Points</th>
								</tr>
								</thead>
								<tbody  class='release_box'>
								<tr>
									<td class='status-{{release.status}}'>E2E</td>
									<td>{{this.prettyDate(release.team.start)}}</td>
									<td>{{this.prettyDate(release.team.due)}}</td>
									<td>{{this.prettyDate(release.team.dueLastPeriod)}}</td>
									<td>{{release.team.workingBusinessDays}}</td>
									<td>{{release.team.weightedEstimate}}</td>
								</tr>
								<tr>
									<td>Dev</td>
									<td>{{this.prettyDate(release.dev.start)}}</td>
									<td>{{this.prettyDate(release.dev.due)}}</td>
									<td>{{this.prettyDate(release.dev.dueLastPeriod)}}</td>
									<td>{{release.dev.workingBusinessDays}}</td>
									<td>{{release.dev.weightedEstimate}}</td>
								</tr>
								<tr>
									<td>QA</td>
									<td>{{this.prettyDate(release.qa.start)}}</td>
									<td>{{this.prettyDate(release.qa.due)}}</td>
									<td>{{this.prettyDate(release.qa.dueLastPeriod)}}</td>
									<td>{{release.qa.workingBusinessDays}}</td>
									<td>{{release.qa.weightedEstimate}}</td>
								</tr>
								<tr>
									<td>UAT</td>
									<td>{{this.prettyDate(release.uat.start)}}</td>
									<td>{{this.prettyDate(release.uat.due)}}</td>
									<td>{{this.prettyDate(release.uat.dueLastPeriod)}}</td>
									<td>{{release.uat.workingBusinessDays}}</td>
									<td>{{release.uat.weightedEstimate}}</td>
								</tr>
								</tbody>
							</table>
							<table class='basic-table'>
								<thead>
								<tr><th>Initiative</th>
										<th>Teams</th>
										<th>Dev Dates</th>
										<th>Dev Epics</th>

										<th>QA Dates</th>
										<th>QA Epics</th>

										<th>UAT Dates</th>
										<th>UAT Epics</th>
								</tr>
								</thead>
								<tbody>
								{{# for(initiative of release.initiatives) }}
										<tr  class='release_box'>
											<td><a class="status-{{initiative.status}}" href="{{initiative.url}}">{{initiative.Summary}}</a></td>

											<td>
												{{# for(team of this.initiativeTeams(initiative) ) }}
													{{team}}
												{{/ for }}
											</td>

											<td>
												Start: {{this.prettyDate(initiative.dev.start)}} <br/>
												Due: {{this.prettyDate(initiative.dev.due)}} <br/>
												Last Due: {{this.prettyDate(initiative.dev.dueLastPeriod)}}

											</td>
											<td>
												<ul>
												{{# for( epic of initiative.dev.issues ) }}
													<li><a class="status-{{epic.status}}" href="{{epic.url}}">
														{{epic.Summary}}
													</a> [{{epic.weightedEstimate}}] ({{epic.workingBusinessDays}})</li>
												{{/ }}
												</ul>
											</td>


											<td>
												Start: {{this.prettyDate(initiative.qa.start)}} <br/>
												Due: {{this.prettyDate(initiative.qa.due)}} <br/>
												Last Due: {{this.prettyDate(initiative.qa.dueLastPeriod)}}

											</td>
											<td>
												<ul class='release_box'>
												{{# for( epic of initiative.qa.issues ) }}
													<li><a class="status-{{epic.status}}" href="{{epic.url}}">
														{{epic.Summary}}
													</a></li>
												{{/ }}
												</ul>
											</td>

											<td>
												Start: {{this.prettyDate(initiative.uat.start)}} <br/>
												Due: {{this.prettyDate(initiative.uat.due)}} <br/>
												Last Due: {{this.prettyDate(initiative.uat.dueLastPeriod)}}

											</td>
											<td>
												<ul class='release_box'>
												{{# for( epic of initiative.uat.issues ) }}
													<li><a class="status-{{epic.status}}" href="{{epic.url}}">
														{{epic.Summary}}
													</a></li>
												{{/ }}
												</ul>
											</td>
										</tr>
									{{/ for}}
								</tbody>
							</table>



							<ul>
							</ul>
						{{/ for }}


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
		},
		mode: {
			type: String,
		},
		getReleaseValue: {
			type: Function,
			default: function(issue){
				return issue?.[FIX_VERSIONS_KEY]?.[0]?.name;
			}
		}
  };
  // hooks
  async connected() {
		this.jiraHelpers.getServerInfo().then( (serverInfo) => {
			this.serverInfo = serverInfo;
		});

		if(this.jql) {
			const serverInfoPromise = this.jiraHelpers.getServerInfo();

			const issuesPromise = this.jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
				jql: this.jql,
				fields: ["summary",
						"Start date",
						"Due date",
						"Issue Type",
						"Fix versions",
						"Story Points",
						"Confidence",
						"Product Target Release", PARENT_LINK_KEY, LABELS_KEY, STATUS_KEY ],
				expand: ["changelog"]
			});

			Promise.all([
				issuesPromise, serverInfoPromise
			]).then( ([issues, serverInfo])=>{
				this.rawIssues = addWorkingBusinessDays( toCVSFormat(issues, serverInfo) );
			})


		}

  }

  drawSlide(results) {
		this.rawIssues = makeObjectsFromRows(results.data);
  }
	get teams(){
		if(!this.rawIssues) {
			return new Set();
		}
		return new Set( this.rawIssues.map( issue => issue["Project key"]) );
	}
	get teamKeyToCharacters(){
		if(!this.teams) {
			return [];
		}
		const names = this.teams;
		return characterNamer(names);
	}
	get issuesMappedByParentKey(){
		if(!this.rawIssues) {
			return {};
		}
		const map = {};
		for(const issue of this.rawIssues) {
			if(issue[PARENT_LINK_KEY]){
				if(!map[issue[PARENT_LINK_KEY]]){
					map[issue[PARENT_LINK_KEY]] = []
				}
				map[issue[PARENT_LINK_KEY]].push(issue);
			}
		}
		return map;
	}
	get sortedIncompleteReleasesInitiativesAndEpics(){
		if(!this.rawIssues) {
			return [];
		}
		const issuesMappedByParentKey = this.issuesMappedByParentKey;
		const releasesToInitiatives = mapReleasesToIssues(
			filterReleases(
				filterOutStatuses(
					filterInitiatives(this.rawIssues), ["Done", "Partner Review"]),
					this.getReleaseValue
				),
				this.getReleaseValue
			);

		const semverReleases = semverSort(Object.keys(releasesToInitiatives));

		const shortReleaseNames = uniqueTrailingNames(semverReleases);

		return semverReleases.map( (release, index) => {
			const initiatives = releasesToInitiatives[release].map( (i) => {

				const timedEpics = (issuesMappedByParentKey[i[ISSUE_KEY]] || []).map( (e) => {
					const {dueDateWasPriorToTheFirstChangeAfterTheCheckpoint} = howMuchHasDueDateMovedForwardChangedSince(e, FOUR_WEEKS_AGO)
					return addStatusToEpic({
						...e,
						dueLastPeriod: dueDateWasPriorToTheFirstChangeAfterTheCheckpoint
					})
				});

				// try to figure out what is dev or QA
				const qaEpics = new Set( filterQAWork(timedEpics) );
				const uatEpics = new Set( filterPartnerReviewWork(timedEpics) );
				const devEpics = timedEpics.filter( epic => !qaEpics.has(epic) && !uatEpics.has(epic))

				return addStatusToInitiative({
					...i,
					team: epicTimingData(timedEpics),
					dev: epicTimingData([...devEpics]),
					qa: epicTimingData([...qaEpics]),
					uat: epicTimingData([...uatEpics])
				});
			});

			const releaseObject = {
				release: release,
				shortName: shortReleaseNames[index],
				initiatives
			}

			for(const key of ["team","dev","qa","uat"]) {
				releaseObject[key] = epicTimingData(
					initiatives.map( i => i[key].issues).flat()
				)
			}

			return addTeamBreakdown(addStatusToRelease( releaseObject ));
		})
	}
	get releases(){
		if(!this.rawIssues ) {
			return undefined;
		}
		const data = this.sortedIncompleteReleasesInitiativesAndEpics;
		console.log(data);
		return data;
	}
	get releasesAndNext(){
		if(this.releases) {
			let releasesAndNext = [
				...this.releases/*,
				{
					release: "Next",
					initiatives: sortReadyFirst(filterPlanningAndReady(
						filterOutReleases(
							filterInitiatives(this.rawIssues),
							this.getReleaseValue
						)))
				}*/];
			return releasesAndNext;
		}
	}

	prettyDate(date){
		return date ? dateFormatter.format(date) : "";
	}

	initiativeTeams(initiative) {
		return [...new Set( initiative.team.issues.map( issue => issue["Project key"]) ) ];
	}

	/*teamWork(work) {
		const teamToWork = {};
		issues.forEach( issue => {
			let teamKey = issue["Project key"]
			if(!teamToWork[teamKey]) {
				teamToWork[teamKey] = 0
			}
			//teamToWork[teamKey] +=
		}) )
		const teams = [...new Set( work.issues.map( issue => issue["Project key"]) ) ];

	}*/
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

function filterReleases(issues, getReleaseValue){
	return issues.filter( issue => getReleaseValue(issue))
}

function filterOutReleases(issues, getReleaseValue){
	return issues.filter( issue => !getReleaseValue( issue ) );
}
function filterPlanningAndReady(issues){
	return issues.filter( issue => ["Ready","Planning"].includes(issue.Status))
}
function filterOutStatuses(issues, statuses) {
	return issues.filter( issue => !statuses.includes(issue.Status))
}

function mapReleasesToIssues(issues, getReleaseValue) {
	const map = {};
	issues.forEach((issue) => {
		const release = getReleaseValue(issue)
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
		let match = release.match(/(?:\d+\.\d+\.[\dX]+)|(?:\d+\.[\dX]+)|(?:\d+)$/);
		if(match) {
			let clean = match[0].replace(".X",".0");
			if(clean.length === 1) {
				clean = clean+".0.0";
			}
			if(clean.length === 3) {
				clean = clean+".0";
			}
			if( semver.clean(clean) ){
				cleanMap[clean] = release;
				cleanValues.push(clean);
			}
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
	return issues.filter(
		issue => issue[LABELS_KEY].filter(
			l => l.includes(label)
		).length
	);
}
function filterQAWork(issues) {
	return filterByLabel(issues, "QA")
}
function isQAWork(issue) {
	return filterQAWork([issue]).length > 0
}
function filterPOSWork(issues) {
	return filterByLabel(issues, "POS_WORK")
}
function filterPartnerReviewWork(issues) {
	return filterByLabel(issues, "UAT")
}
function isPartnerReviewWork(issue) {
	return filterPartnerReviewWork([issue]).length > 0
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
	).map( init => Date.parse(init[property]))
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


function epicTimingData(epics) {
	const sorted = sortByStartDate(epics);
	return {
		issues: sorted,
		start: firstDateFromList(sorted),
		due: endDateFromList(sorted),
		dueLastPeriod: endDateFromList(sorted,"dueLastPeriod"),
		workingBusinessDays: epics.reduce( (acc, cur)=>{
			return acc + (cur.workingBusinessDays || 0 )
		}, 0),
		weightedEstimate: epics.reduce( (acc, cur)=>{
			return acc + (cur.weightedEstimate || 0 )
		}, 0)
	}
}

function endDateFromList(issues, property = DUE_DATE_KEY) {
	const values = issues.filter(
		issue => issue[property]
	).map( issue => Date.parse(issue[property]) )
	.filter( (number) => !isNaN(number) );
	return values.length ? new Date(Math.max(...values)) : undefined;
}


function firstDateFromList(issues) {
	const values = issues.filter(
		issue => issue[START_DATE_KEY]
	).map( issue => Date.parse(issue[START_DATE_KEY]));
	return values.length ? new Date(Math.min(...values)) : undefined;
}

function getFirstDateFrom(initiatives, property) {
	const values = initiatives.filter(
		init => init[property]?.[START_DATE_KEY]
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

function toCVSFormat(issues, serverInfo){
	return issues.map( issue => {
		return {
			...issue.fields,
			changelog: issue.changelog,
			"Project key": issue.key.replace(/-.*/,""),
			[ISSUE_KEY]: issue.key,
			url: serverInfo.baseUrl+"/browse/"+issue.key,
			[ISSUE_TYPE_KEY]: issue.fields[ISSUE_TYPE_KEY].name,
			[PRODUCT_TARGET_RELEASE_KEY]: issue.fields[PRODUCT_TARGET_RELEASE_KEY]?.[0],
			[PARENT_LINK_KEY]: issue.fields[PARENT_LINK_KEY]?.data?.key,
			[STATUS_KEY]: issue.fields[STATUS_KEY]?.name
		}
	})
}
function addWorkingBusinessDays(issues) {


	return issues.map( issue => {
		let weightedEstimate = null;
		if( issue["Story Points"]) {
			if(issue["Confidence"]) {
				weightedEstimate = issue["Story Points"] + Math.round( estimateExtraPoints(issue["Story Points"], issue["Confidence"]) );
			} else {
				weightedEstimate = issue["Story Points"];
			}
		}

		return {
			...issue,
			workType: isQAWork(issue) ? "qa" : ( isPartnerReviewWork(issue) ? "uat" : "dev"),
			workingBusinessDays:
				issue["Due date"] && issue["Start date"] ?
					getBusinessDatesCount( new Date(issue["Start date"]), new Date(issue["Due date"]) )  : null,
			weightedEstimate: weightedEstimate
		};
	})
}

function addToCharacterMap(fullName, name, map = {}) {
	if(name === "") {
		map.last = true;
	}
	map.followers.push(fullName);

	if( !map.characterMap[name[0]] ) {
		map.characterMap[name[0]] = {
			followers: [],
			characterMap: {}
		};
	}
	if(name !== "") {
		addToCharacterMap(fullName, name.substr(1), map.characterMap[name[0]])
	}
}

function pruneFrom(rootMap, path, namesToCharacter) {

	while(Object.keys(rootMap.characterMap).length) {
		const character = Object.keys(rootMap.characterMap)[0];
		const childMap = rootMap.characterMap[character];
		if(childMap.followers.length === 1) {
			namesToCharacter[childMap.followers[0]] = character;
			delete rootMap.characterMap[character];
		} else if(childMap.last === true){
			namesToCharacter[path+character] = character;
			pruneFrom(childMap, path+character, namesToCharacter);
			delete rootMap.characterMap[character];
		} else {
			pruneFrom(childMap, path+character, namesToCharacter);
			delete rootMap.characterMap[character];
		}
	}
}

function characterNamer(names) {
	const root = {
		characterMap: {},
		followers: []
	};
	for(const name of names){
		addToCharacterMap(name, name, root);
	}
	const namesToCharacter = {};
	pruneFrom(root, "",namesToCharacter);
	return namesToCharacter;
}


function uniqueTrailingNames(names) {
	const root = {
		characterMap: {},
		followers: []
	};
	for(const name of names){
		addToCharacterMap(name, name, root);
	}
	// keep going down the 1 path until you don't have everything
	let current = root;
	let startingWith = "";
	while(Object.keys(current.characterMap).length === 1) {
		let character = Object.keys(current.characterMap)[0];
		startingWith = startingWith + character;
		current = current.characterMap[character];
	}

	return names.map( n => n.replace(startingWith,"") )
}

function addTeamBreakdown(release) {

	return {
		...release
	}
}



// ontrack
// behind
// complete
