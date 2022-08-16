const core = require('@actions/core');
const github = require('@actions/github');

const https = require('node:https');
const spawn = require('child_process').spawn;

try {
    const path = core.getInput('path');
    const api_key = core.getInput('api_key');
    const customer_id = core.getInput('customer_id');
    const hosting_id = core.getInput('hosting_id');

    request = https.request(
        `https://staging-api.cm4all.works/v1/customers/${customer_id}/instances/hostings/${hosting_id}/untar`,
        {
            'method': 'PUT',
            'headers': {
                'api-key': api_key,
                'content-type': 'application/x-tar',
                'expect': '100-continue',
            }
        },
        (res) => {
            console.log(res.statusCode);

            if (res.statusCode !== 201) {
                core.setFailed(`PUT failed: ${res.statusCode}`);
                res.resume();
                return;
            }
        },
    );

    request.on('continue', () => {
        console.log('continue');

        const child = spawn('/bin/tar', ['cC', path, '.']);
        child.stdout.on('data', (data) => {
            console.log("data");
            request.write(data);
        });

        child.on('close', (code) => {
            console.log("close code="+code);
            if (code !== 0) {
                core.setFailed(`tar failed: ${code}`);
                request.destroy();
                return;
            }

            request.end();
        });

        child.on('error', (err) => {
            core.setFailed(`tar failed: ${err}`);
            request.destroy();
        });
    });

    request.on('error', (err) => {
        core.setFailed(`PUT failed: ${err}`);
    });
} catch (error) {
    core.setFailed(error.message);
}
