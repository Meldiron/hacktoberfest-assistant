// Script to find issues with same name. Used when we screwed up and made duplicates by mistake

var GitHub = require("github-api");
var axios = require("axios");

require("dotenv").config();

const gh = new GitHub({
    //  username: 'FOO',
    //  password: 'NotFoo'
    token: process.env.GITHUB_TOKEN,
});

const coreTeam = [
    "eldadfux",
    "christyjacob4",
    "TorstenDittmann",
    "lohanidamodar",
    "kodumbeats",
    "abnegate",
    "PineappleIOnic",
    "sarakaandorp",
    "Meldiron",
    "adityaoberai",
];

(async () => {
    let issuesObj = {};

    const orgNames = ["appwrite", "utopia-php"];
    for (const orgName of orgNames) {
        //   console.log("Scanning org...", orgName);

        const org = await gh.getOrganization(orgName);
        const repos = (await org.getRepos()).data;

        for (const repo of repos) {
            //    console.log("Scanning repo...", repo.name);

            const issueObj = gh.getIssues(orgName, repo.name);
            const issues = (
                await issueObj.listIssues({
                    state: "open",
                    labels: "hacktoberfest",
                    since: "2021-01-01",
                })
            ).data;

            for (const issue of issues) {
                if (issuesObj[issue.title]) {
                    issuesObj[issue.title].push(issue);
                } else {
                    issuesObj[issue.title] = [issue];
                }
            }
        }
    }

    const issuesStats = Object.keys(issuesObj)
        .map((k) => issuesObj[k])
        .sort((a, b) => (a.length > b.length ? -1 : 1))
        .filter((i) => i.length > 1);

    issuesStats.forEach((iArr) => {
        console.log(iArr[0].title + ":");

        iArr.forEach((i) => {
            console.log(i.html_url);
        });

        console.log("----");
    });

    console.log("Found problematic issues", issuesStats.length);
})()
    .then(() => {
        console.log("Finished!");
    })
    .catch((err) => {
        throw err;
    });
