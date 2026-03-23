#!/usr/bin/env python3
"""
Healthcare Bot Test Execution and Reporting Pipeline

Executes Botium tests against the healthcare chatbot, generates reports,
uploads to S3, and sends notifications.

Usage:
    python python_send.py --Config demo-stage-wa
    python python_send.py --Config demo-prod

Configure AWS credentials in ~/.aws/credentials or use IAM roles.
"""

import boto3
import subprocess
import datetime
from botocore.exceptions import ClientError
import os
import json
import shutil
import getopt
import sys
import requests
import random

# Healthcare bot test environments
botium_config_envs = [
    'demo-stage', 'demo-stage-wa',
    'demo-prod', 'demo-prod-wa',
]


def call_botium(env):
    """Execute Botium tests for the specified environment."""
    print("Running tests and generating reports")
    try:
        if env in botium_config_envs:
            print(f"Environment: {env}")
            output = subprocess.call(
                f'npx botium-cli run mochawesome --convos ./spec/convo/health_check/{env} '
                f'--timeout 120000 --reporter-options reportDir=$NODE_ENV',
                shell=True
            )
            print(f"Status of command run: {output}")
        else:
            raise ValueError(f"Invalid environment: {env}")
    except Exception as e:
        print(str(e))
        return False
    return True


def upload_reports(env):
    """Compress and upload test reports to S3."""
    REPORT_NAME = "healthcare_bot_tests_" + str(
        datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    ) + ".zip"

    PATH = "/home/ubuntu/healthcare-bot-tests/reports/" + REPORT_NAME
    ZIP_COMMAND = f'/usr/bin/zip {PATH} -r {env}/'

    try:
        output = subprocess.check_output(ZIP_COMMAND, shell=True)
        print(f"Compressed: {str(output)}")

        s3 = boto3.client('s3')
        bucket_name = 'healthcare-bot-test-reports'

        s3.upload_file(PATH, bucket_name, REPORT_NAME, ExtraArgs={'ACL': 'public-read'})
        print("Reports uploaded to S3")
    except Exception as e:
        print(str(e))
        return "", False

    return REPORT_NAME, True


def get_overall_result(env):
    """Parse mochawesome JSON report and extract test statistics."""
    try:
        f = open(f'{env}/mochawesome.json')
        data = json.load(f)
        print('Test data loaded')

        FAILURE_COUNT = data['stats']['failures']
        PASS_COUNT = data['stats']['passes']
        TOTAL_TESTS = data['stats']['testsRegistered']
        PASS_PERCENTAGE = data['stats']['passPercent']
        START_DATE = data['stats']['start']
        END_DATE = data['stats']['end']

        if FAILURE_COUNT > 0:
            ERROR_MESSAGE = data['results'][0]['suites'][0]['tests'][0]['err']['message']
        else:
            ERROR_MESSAGE = ""

        f.close()

        result = {
            "ErrorMessage": ERROR_MESSAGE,
            "TotalTests": TOTAL_TESTS,
            "FailedTests": FAILURE_COUNT,
            "PassedTests": PASS_COUNT,
            "PassPercentage": PASS_PERCENTAGE,
            "StartDate": START_DATE,
            "EndDate": END_DATE
        }
        return result
    except Exception as e:
        print(f"Error parsing test results: {e}")
        return None


def send_mail(status, REPORT_NAME="", msg="", env=""):
    """Send test results via AWS SES email."""
    print("Sending test report email")

    SENDER = "Healthcare Bot Tests <automation@healthcare.example.com>"
    RECIPIENTS = ["qa-team@healthcare.example.com"]
    SUBJECT = "Healthcare Bot Test Report"

    if status:
        URL = "https://healthcare-bot-test-reports.s3.us-east-1.amazonaws.com/" + REPORT_NAME
        result = get_overall_result(env)
        test_env = get_config()

        if result:
            print(f"Environment: {test_env}")
            total_tests = result["TotalTests"]
            fail_count = result["FailedTests"]
            pass_count = result["PassedTests"]
            pass_percentage = result["PassPercentage"]
            start_date = result["StartDate"]
            end_date = result["EndDate"]

            print(f"Total Tests: {total_tests}")
            print(f"Failed: {fail_count}")
            print(f"Passed: {pass_count}")
            print(f"Pass Rate: {pass_percentage}%")

            BODY_HTML = f"""
            <html>
            <head></head>
            <body>
            <h2 style='text-align: center'>Healthcare Bot Test Results</h2>
            <h3>Environment: {test_env}</h3>
            <h3>Start: {start_date}</h3>
            <h3>End: {end_date}</h3>
            <table border='1' style='border-collapse:collapse' width=100%>
                <tr style='text-align: center'>
                    <th>Total Tests</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Pass Rate</th>
                </tr>
                <tr style='text-align: center'>
                    <td>{total_tests}</td>
                    <td>{pass_count}</td>
                    <td>{fail_count}</td>
                    <td>{pass_percentage}%</td>
                </tr>
            </table>
            <br/>
            <a href="{URL}">View Report</a>
            </body>
            </html>
            """
            SUBJECT = f"{SUBJECT} - {start_date}"
    else:
        SUBJECT = "Healthcare Bot Test Report - Failed"
        BODY_HTML = f"<html><head></head><body>{msg}</body></html>"

    CHARSET = "UTF-8"
    client = boto3.client('ses')

    try:
        response = client.send_email(
            Destination={'ToAddresses': RECIPIENTS},
            Message={
                'Body': {
                    'Html': {
                        'Charset': CHARSET,
                        'Data': BODY_HTML,
                    }
                },
                'Subject': {
                    'Charset': CHARSET,
                    'Data': SUBJECT,
                },
            },
            Source=SENDER,
        )
        print(f"Email sent! Message ID: {response['MessageId']}")
    except ClientError as e:
        print(f"Email send failed: {e.response['Error']['Message']}")


def get_config():
    """Parse command-line arguments to get target environment."""
    argumentList = sys.argv[1:]
    options = "hc:"
    long_options = ["Help", "Config="]

    try:
        arguments, values = getopt.getopt(argumentList, options, long_options)
        for currentArgument, currentValue in arguments:
            if currentArgument in ("-h", "--Help"):
                print("Usage: python python_send.py --Config <environment>")
                print(f"Available environments: {', '.join(botium_config_envs)}")
            elif currentArgument in ("-c", "--Config"):
                print(f"Target environment: {currentValue}")
                return currentValue
    except getopt.error as err:
        print(f"Argument error: {str(err)}")

    return None


def send_slack_notification(result, env):
    """Send test failure alerts to Slack."""
    print(f"Sending Slack alert for: {env}")

    if 'prod' in env:
        url = "https://hooks.slack.com/services/YOUR/HEALTHBOT/PROD/WEBHOOK"
    else:
        url = "https://hooks.slack.com/services/YOUR/HEALTHBOT/STAGING/WEBHOOK"

    message = result.get('ErrorMessage', 'Unknown error')
    title = f"Healthcare Bot Test Failure - {env}"

    slack_data = {
        "username": "healthcare-bot-tests",
        "text": f"{title}\n{message}"
    }

    byte_length = str(sys.getsizeof(slack_data))
    headers = {
        'Content-Type': 'application/json',
        'Content-Length': byte_length
    }

    try:
        response = requests.post(
            url,
            data=json.dumps(slack_data),
            headers=headers,
            timeout=10
        )
        if response.status_code != 200:
            print(f"Slack notification failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error sending Slack notification: {e}")


if __name__ == "__main__":
    print(f"Started: {datetime.datetime.now()}")

    test_framework_dir = '/home/ubuntu/healthcare-bot-tests'
    print(f"Test directory: {test_framework_dir}")

    try:
        os.chdir(test_framework_dir)
    except FileNotFoundError:
        print(f"ERROR: Directory not found: {test_framework_dir}")
        sys.exit(1)

    env_config = get_config()
    if not env_config:
        print("ERROR: No environment specified. Use --Config <environment>")
        sys.exit(1)

    print(f"Environment: {env_config}")
    os.environ['NODE_ENV'] = env_config

    if call_botium(env_config):
        REPORT_NAME, STATUS = upload_reports(env_config)
        if STATUS:
            result = get_overall_result(env_config)
            if result:
                fail_count = result["FailedTests"]

                if fail_count > 0:
                    print(f"FAILED: {fail_count} test(s) failed")
                    send_mail(status=True, REPORT_NAME=REPORT_NAME, msg="Tests completed with failures", env=env_config)
                    send_slack_notification(result, env_config)
                else:
                    print("SUCCESS: All tests passed")
                    send_mail(status=True, REPORT_NAME=REPORT_NAME, msg="All tests passed", env=env_config)
        else:
            print("ERROR: S3 upload failed")
            send_mail(status=False, msg="Failed to upload reports to S3")
    else:
        print("ERROR: Botium test execution failed")
        send_mail(status=False, msg="Botium test execution failed")
