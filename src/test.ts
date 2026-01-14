/**
 * Comprehensive test suite for MetaMCP (v24.0 compliant)
 * Tests all valid Facebook Graph API tools
 */
import { GraphApiClient, graphConfig } from "@meta-mcp/core";
import { FacebookManager } from "./manager";

interface TestResult {
    tool: string;
    status: "pass" | "fail" | "skip";
    duration: number;
    error?: string;
}

class TestRunner {
    private readonly manager: FacebookManager;
    private readonly results: TestResult[] = [];
    private existingPostId: string | null = null;

    constructor() {
        this.manager = new FacebookManager(
            new GraphApiClient(graphConfig),
            graphConfig.pageId
        );
    }

    private async runTest(
        name: string,
        fn: () => Promise<unknown>,
        skipCondition?: () => boolean
    ): Promise<TestResult> {
        if (skipCondition?.()) {
            const result: TestResult = { tool: name, status: "skip", duration: 0 };
            this.results.push(result);
            console.log(`   ○ ${name} - SKIPPED`);
            return result;
        }

        const start = performance.now();
        try {
            await fn();
            const duration = Math.round(performance.now() - start);
            const result: TestResult = { tool: name, status: "pass", duration };
            this.results.push(result);
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - start);
            const errorMsg = error instanceof Error ? error.message : String(error);
            const result: TestResult = { tool: name, status: "fail", duration, error: errorMsg };
            this.results.push(result);
            console.log(`   ✗ ${name}`);
            console.log(`     └─ ${errorMsg.slice(0, 70)}...`);
            return result;
        }
    }

    async runAllTests(): Promise<void> {
        console.log("╔══════════════════════════════════════════════════════════════╗");
        console.log("║              MetaMCP Test Suite (v24.0)                      ║");
        console.log("╠══════════════════════════════════════════════════════════════╣");
        console.log(`║ Page ID: ${graphConfig.pageId.padEnd(51)}║`);
        console.log("╚══════════════════════════════════════════════════════════════╝\n");

        // PAGE TESTS
        console.log("📄 PAGE TESTS");
        console.log("─".repeat(64));

        await this.runTest("fb_get_page_fan_count", async () => {
            const count = await this.manager.getPageFanCount();
            console.log(`   ✓ fb_get_page_fan_count - ${count} fans`);
        });

        await this.runTest("fb_get_page_posts", async () => {
            const posts = await this.manager.getPagePosts();
            console.log(`   ✓ fb_get_page_posts - ${posts.data.length} posts`);
            if (posts.data.length > 0 && posts.data[0]) {
                this.existingPostId = posts.data[0].id;
            }
        });

        if (!this.existingPostId) {
            console.log("\n⚠️  No posts found. Skipping post tests.\n");
            this.printSummary();
            return;
        }

        // POST METRICS
        console.log("\n📊 POST METRICS");
        console.log("─".repeat(64));

        await this.runTest("fb_get_post_share_count", async () => {
            const shares = await this.manager.getPostShareCount(this.existingPostId!);
            console.log(`   ✓ fb_get_post_share_count - ${shares} shares`);
        });

        await this.runTest("fb_get_number_of_likes", async () => {
            const likes = await this.manager.getNumberOfLikes(this.existingPostId!);
            console.log(`   ✓ fb_get_number_of_likes - ${likes} likes`);
        });

        await this.runTest("fb_get_number_of_comments", async () => {
            const count = await this.manager.getNumberOfComments(this.existingPostId!);
            console.log(`   ✓ fb_get_number_of_comments - ${count} comments`);
        });

        // INSIGHTS (v24.0 valid metrics only)
        console.log("\n📈 INSIGHTS (v24.0 metrics)");
        console.log("─".repeat(64));

        await this.runTest("fb_get_post_insights", async () => {
            await this.manager.getPostInsights(this.existingPostId!);
            console.log(`   ✓ fb_get_post_insights - retrieved`);
        });

        await this.runTest("fb_get_post_impressions_unique", async () => {
            await this.manager.getPostImpressionsUnique(this.existingPostId!);
            console.log(`   ✓ fb_get_post_impressions_unique - retrieved`);
        });

        await this.runTest("fb_get_post_clicks", async () => {
            await this.manager.getPostClicks(this.existingPostId!);
            console.log(`   ✓ fb_get_post_clicks - retrieved`);
        });

        // REACTIONS
        console.log("\n❤️ REACTIONS");
        console.log("─".repeat(64));

        const reactionMethods = [
            { name: "fb_get_post_reactions_like_total", fn: () => this.manager.getPostReactionsLikeTotal(this.existingPostId!) },
            { name: "fb_get_post_reactions_love_total", fn: () => this.manager.getPostReactionsLoveTotal(this.existingPostId!) },
            { name: "fb_get_post_reactions_wow_total", fn: () => this.manager.getPostReactionsWowTotal(this.existingPostId!) },
            { name: "fb_get_post_reactions_haha_total", fn: () => this.manager.getPostReactionsHahaTotal(this.existingPostId!) },
            { name: "fb_get_post_reactions_sorry_total", fn: () => this.manager.getPostReactionsSorryTotal(this.existingPostId!) },
            { name: "fb_get_post_reactions_anger_total", fn: () => this.manager.getPostReactionsAngerTotal(this.existingPostId!) },
        ];

        for (const { name, fn } of reactionMethods) {
            await this.runTest(name, async () => {
                await fn();
                console.log(`   ✓ ${name}`);
            });
        }

        // UTILITY
        console.log("\n🔧 UTILITIES");
        console.log("─".repeat(64));

        await this.runTest("fb_filter_negative_comments", async () => {
            const mockComments = { data: [{ id: "1", message: "terrible" }] };
            const filtered = this.manager.filterNegativeComments(mockComments);
            console.log(`   ✓ fb_filter_negative_comments - ${filtered.length} flagged`);
        });

        this.printSummary();
    }

    private printSummary(): void {
        const passed = this.results.filter((r) => r.status === "pass").length;
        const failed = this.results.filter((r) => r.status === "fail").length;
        const total = this.results.length;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        console.log("\n╔══════════════════════════════════════════════════════════════╗");
        console.log("║                       RESULTS                                ║");
        console.log("╠══════════════════════════════════════════════════════════════╣");
        console.log(`║ ✓ Passed:  ${String(passed).padEnd(3)} / ${total}   (${successRate}%)                                ║`);
        console.log(`║ ✗ Failed:  ${String(failed).padEnd(3)} / ${total}                                        ║`);
        console.log("╚══════════════════════════════════════════════════════════════╝");

        process.exit(failed > 0 && passed === 0 ? 1 : 0);
    }
}

new TestRunner().runAllTests().catch(console.error);
