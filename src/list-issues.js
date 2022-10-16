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

const isMultiIssue = (title) => {
    if(title.includes("Help Developers by Coding Demo of")) {
        return true;
    }

    if(title.includes("Make a Dream Contribution")) {
        return true;
    }

    if(title.includes("Help Developers by Writing Article About")) {
        return true;
    }

    if(title.includes("Build Almost")) {
        return true;
    }

    if(title.includes("Write Article About Importing")) {
        return true;
    }

    return false;
};
// TODO: do a search instead.
const multipleAllowed = [
    4202,
    4201,
    4200,
    4199,
    4198,
    4197,
    4196,
    4195,
    4194,
    3970,
    3969,
    3968,
    3967,
    3966,
    3965,
    3964,
    3963,
    3962,
    3961,
    4253,
    4252,
    4251,
    4250,
    4249,
    4248,
    4247,
    4246,
    4245,
    4244,
    4243,
    4242,
    4241,
    4240,
    4239,
    4238,
    4237,
    4236,
    4235,
    4234,
    4233,
    4232,
    4231,
    4229,
    4228,
    4227,
    4226,
    4225,
    4224,
    4223,
    4222,
    4221,
    4220,
    4219,
    4218,
    4217,
    4216,
    4215,
    4024,
    4036,
    4035,
    4034,
    4033,
    4032,
    4031,
    4030,
    4029,
    4028,
    4026,
    4025,
    4024,
    4286,
    4287,
];

(async () => {
    let totalAcceptedPrs = 0;

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
                let activityEmoji = activity.customType == 'issue' ? '📄' : '🐛';
                isMultiIssue(activity.title) ? activityEmoji += '👨‍👨‍👧‍👦' : false;
                try {
                    if (new Date(activity.created_at).getFullYear() < 2022) {
                        continue;
                    }

                    let comments = [];

                    if(activity.customType === 'issue') {
                        comments = (await issueObj.listIssueComments(activity.number)).data
                    } else if(activity.customType === 'pr') {
                        const labels = activity.labels ?? [];
                        const acceptedLabel = labels.find((l) => ["hacktoberfest-accepted", "invalid"].includes(l.name));
                        if(acceptedLabel) {
                            totalAcceptedPrs++;
                            continue;
                        }

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

                        const promises = [];

                        const issueUrl = '/repos/' + orgName + '/' + repo.name + '/issues/' + activity.number + '/comments';
                        promises.push(org._requestAllPages(issueUrl));

                        const reviewUrl = '/repos/' + orgName + '/' + repo.name + '/pulls/' + activity.number + '/comments';
                        promises.push(org._requestAllPages(reviewUrl));

                        const [rawIssueComments, rawReviewComments] = await Promise.all(promises);

                        comments = [...rawIssueComments.data, ...rawReviewComments.data,];
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

    console.log("---");
    console.log("Fun fact? We already approved " + totalAcceptedPrs + " PRs! 🎉");
})()
    .then(() => {
        console.log("Finished!");
    })
    .catch((err) => {
        throw err;
    });
