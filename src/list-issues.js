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
                    since: "2022-01-01",
                })
            ).data;

            for (const issue of issues) {
                try {
                    if (new Date(issue.created_at).getFullYear() < 2022) {
                        continue;
                    }

                    const comments = (await issueObj.listIssueComments(issue.number)).data
                        .map((comment) => {
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
                                    console.log("- [ ] 👀 Action required: ", issue.html_url);
                                }
                            } else {
                                console.log("- [ ] 👀 Action required: ", issue.html_url);
                            }
                        }
                    }
                } catch (err) {
                    console.log("❌ Error loading ", issue.html_url);
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
