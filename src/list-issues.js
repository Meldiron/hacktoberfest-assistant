// Script to find issues we need to answer

var GitHub = require("github-api");
var axios = require("axios");

require("dotenv").config();

const gh = new GitHub({
    //  username: 'FOO',
    //  password: 'NotFoo'
    token: process.env.GITHUB_TOKEN,
});

const coreTeam = [
    "wess",
    "eldadfux",
    "stnguyen90",
    "TorstenDittmann",
    "tessamero",
    "elad2412",
    "heyCarla",
    "codercatdev",
    "abnegate",
    "lohanidamodar",
    "sara-k-48",
    "Meldiron",
    "christyjacob4",
    "fogelito",
    "shimonewman",
    "PineappleIOnic",
    "gewenyu99",
    "adityaoberai",
    "Haimantika",
    "ArmanNik",
    "chenparnasa",
    "everly-gif",
    "TenneG",
    "MayEnder"
];

(async () => {
    const orgNames = ["appwrite", "utopia-php", "open-runtimes"];
    for (const orgName of orgNames) {
        // console.log("Scanning org...", orgName);

        const org = await gh.getOrganization(orgName);
        const repos = (await org.getRepos()).data;

        for (const repo of repos) {
            // console.log("Scanning repo...", repo.name);

            const issueObj = gh.getIssues(orgName, repo.name);
            const issues = (
                await issueObj.listIssues({
                    state: "open",
                    labels: "hacktoberfest",
                    since: "2022-01-01",
                })
            ).data;

            const repoObj = gh.getRepo(orgName, repo.name);
            const prs = (await repoObj.listPullRequests({
                state: "open",
            })).data;

            const activities = [
                ...issues.map((i) => { return  { ...i, customType: 'issue' }} ),
                ...prs.map((i) => { return  { ...i, customType: 'pr' }} ),
            ];

            for (const activity of activities) {
                const activityEmoji = activity.customType == 'issue' ? '📄' : '🐛';

                try {
                    if (new Date(activity.created_at).getFullYear() < 2022) {
                        continue;
                    }

                    let comments = [];

                    if(activity.customType === 'issue') {
                        comments = (await issueObj.listIssueComments(activity.number)).data
                    } else if(activity.customType === 'pr') {
                        if(coreTeam.includes(activity.user.login)) {
                            continue;
                        }

                        let [ year, month, day ] = activity.created_at.split("T")[0].split("-");
                        year = +year;
                        month = +month;
                        day = +day;

                        if(year < 2022) {
                            continue;
                        }

                        if(month < 9) {
                            continue;
                        }

                        if(month === 0 && day < 30) {
                            continue;
                        }

                        const url = '/repos/' + orgName + '/' + repo.name + '/issues/' + activity.number + '/comments';
                        const rawComments = await org._requestAllPages(url);
                        comments = rawComments.data;
                    }

                    comments = comments.map((comment) => {
                            return {
                                ...comment,
                                created_at: new Date(comment.created_at).getTime(),
                            };
                        })
                        .sort((commentA, commentB) =>
                            commentA.created_at < commentB.createdAt ? 1 : -1
                        );

                    const lastComment = comments[0];

                    if (lastComment) {
                        const lastCommentAuthor = lastComment.user.login;

                        if (!coreTeam.includes(lastCommentAuthor)) {
                            const totalReactions = lastComment.reactions.total_count;
                            if (totalReactions > 0) {
                                const reactionsUrl = lastComment.reactions.url;

                                const reactionData = (
                                    await axios.get(reactionsUrl, {
                                        headers: {
                                            Authorization: "Bearer " + process.env.GITHUB_TOKEN,
                                        },
                                    })
                                ).data;

                                const adminReaction = reactionData.find((reaction) => {
                                    return coreTeam.includes(reaction.user.login);
                                });

                                if (!adminReaction) {
                                    console.log("- [ ] " + activityEmoji + " Action Required: ", activity.html_url);
                                }
                            } else {
                                console.log("- [ ] " + activityEmoji + " Action Required: ", activity.html_url);
                            }
                        }
                    } else {
                        if(activity.customType === 'pr') {
                            console.log("- [ ] " + activityEmoji + " Action Required: ", activity.html_url);
                        }
                    }
                } catch (err) {
                    console.log(err);
                    console.log("❌ Error Loading ", activity.customType, activity.html_url);
                }
            }
        }
    }
})()
    .then(() => {
        console.log("Finished!");
    })
    .catch((err) => {
        throw err;
    });
