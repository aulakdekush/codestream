// slack integration configuration

'use strict';

const StructuredCfgFile = require('../codestream-configs/lib/structured_config');

let SlackCfg = {
	appClientId: null,
	appClientSecret: null,
	appStrictClientId: null,
	appStrictClientSecret: null
};

let CfgFileName = process.env.CS_API_CFG_FILE || process.env.CSSVC_CFG_FILE;
if (CfgFileName) {
	const CfgData = new StructuredCfgFile({ configFile: CfgFileName });
	let slackProviders = CfgData.getSection('integrations.slack');
	if (slackProviders['slack.com']) {
		SlackCfg = slackProviders['slack.com'];
	}
}
else {
	SlackCfg.appClientId = process.env.CS_API_SLACK_CLIENT_ID;
	SlackCfg.appClientSecret = process.env.CS_API_SLACK_CLIENT_SECRET;
	SlackCfg.appStrictClientId = process.env.CS_API_SLACK_STRICT_CLIENT_ID;
	SlackCfg.appStrictClientSecret = process.env.CS_API_SLACK_STRICT_CLIENT_SECRET;
}

if (process.env.CS_API_SHOW_CFG) console.log('Config[slack]:', SlackCfg);
module.exports = SlackCfg;
