const core = require('@actions/core');
const github = require('@actions/github');

const https = require('node:https');
const spawn = require('child_process').spawn;

try {
    const path = core.getInput('path');
    const ticket = core.getInput('ticket');

    request = https.request(
        `https://staging.cm4all.works/ticket/${ticket}`,
        {
            'method': 'PUT',
            'headers': {
                'content-type': 'application/x-tar',
                'expect': '100-continue',
            }
        },
        (res) => {
            if (res.statusCode !== 201) {
                core.setFailed(`PUT failed: ${res.statusCode}`);
                res.resume();
                return;
            }
        },
    );

    request.on('continue', () => {
        const child = spawn('/bin/tar', ['cC', path, '.']);
        child.stdout.on('data', (data) => {
            request.write(data);
        });

        child.on('close', (code) => {
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
