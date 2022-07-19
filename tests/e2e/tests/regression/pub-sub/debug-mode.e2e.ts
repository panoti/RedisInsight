import { acceptLicenseTermsAndAddDatabaseApi } from '../../../helpers/database';
import { MyRedisDatabasePage, PubSubPage, CliPage } from '../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../helpers/conf';
import { env, rte } from '../../../helpers/constants';
import { verifyMessageDisplayingInPubSub } from '../../../helpers/pub-sub';
import { deleteStandaloneDatabaseApi } from '../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const pubSubPage = new PubSubPage();
const cliPage = new CliPage();

fixture `PubSub debug mode`
    .meta({ env: env.web, rte: rte.standalone, type: 'regression' })
    .page(commonUrl)
    .beforeEach(async t => {
        await acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig, ossStandaloneConfig.databaseName);
        //Go to PubSub page and subscribe to channel
        await t.click(myRedisDatabasePage.pubSubButton);
        await t.click(pubSubPage.subscribeButton);
        //Publish different messages
        await cliPage.sendCommandInCli('10 publish channel first');
        await cliPage.sendCommandInCli('10 publish channel second');
        await cliPage.sendCommandInCli('10 publish channel third');
    })
    .afterEach(async() => {
        await deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });

test('Verify that when user navigating away and back to pubsub window the debug mode state will be reset to default auto-scroll', async t => {
    //Scroll to the first messages
    await t.scrollIntoView(pubSubPage.pubSubPageContainer.find(pubSubPage.cssSelectorMessage).withText('first'));
    //Verify that new messages keep arriving in the background and user can always see up to date count of total messages received.
    await pubSubPage.publishMessage('test', 'message sent in the background');
    await t.expect(pubSubPage.totalMessagesCount.textContent).contains('31', 'Total counter value is incorrect');
    //Verify that when user scroll away from the newest message the auto-scroll is stopped
    await cliPage.sendCommandInCli('30 publish channel additionalMessages');
    await pubSubPage.publishMessage('test', 'new message with no scroll');
    await verifyMessageDisplayingInPubSub('new message with no scroll', false);
    //Go to Browser Page
    await t.click(myRedisDatabasePage.myRedisDBButton);
    //Go to PubSub page
    await t.click(myRedisDatabasePage.pubSubButton);
    //Verify that the debug mode state is reset to default auto-scroll
    await verifyMessageDisplayingInPubSub('new message with no scroll', true);
});
test('Verify that when user scroll all the way to the newest available message (down), auto-scroll resumes automatically.', async t => {
    //Scroll to the first messages
    await t.scrollIntoView(pubSubPage.pubSubPageContainer.find(pubSubPage.cssSelectorMessage).withText('first'));
    await pubSubPage.publishMessage('test', 'message to scroll');
    await t.scrollIntoView(pubSubPage.pubSubPageContainer.find(pubSubPage.cssSelectorMessage).withText('message to scroll'));
    await cliPage.sendCommandInCli('20 publish channel fourth');
    //Verify auto-scroll resumes automatically
    await verifyMessageDisplayingInPubSub('fourth', true);
});
test('Verify that user can get to the newest message in one click', async t => {
    //Scroll to the first messages
    await t.scrollIntoView(pubSubPage.pubSubPageContainer.find(pubSubPage.cssSelectorMessage).withText('first'));
    await pubSubPage.publishMessage('test', 'new message');
    await t.click(pubSubPage.scrollDownButton);
    //Verify the user scrolled to the newest message
    await verifyMessageDisplayingInPubSub('new message', true);
});
