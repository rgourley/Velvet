# CI/CD Integration Guide

Complete guide for integrating velvet into your CI/CD pipeline.

## Table of Contents

- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [CircleCI](#circleci)
- [Jenkins](#jenkins)
- [Bitbucket Pipelines](#bitbucket-pipelines)
- [Azure Pipelines](#azure-pipelines)
- [Travis CI](#travis-ci)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## GitHub Actions

### Basic Setup

Create `.github/workflows/code-review.yml`:

```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Important: fetch full history

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run code review
        run: npx velvet run --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Setup

With caching, multiple Node versions, and conditional execution:

```yaml
name: Code Review
on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run code review
        if: matrix.node-version == 18
        run: npx velvet run --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload review results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: review-results
          path: review-results.json
```

### Separate Workflow for Local Review

Run without posting to GitHub (faster feedback):

```yaml
name: Quick Review
on: [push, pull_request]

jobs:
  local-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npx velvet local
```

### With Custom Reviewfile

Use different reviewfiles for different scenarios:

```yaml
name: Code Review
on: [pull_request]

jobs:
  review-strict:
    if: github.base_ref == 'main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx velvet run --reviewfile ./reviewfile-strict.ts --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  review-relaxed:
    if: github.base_ref != 'main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx velvet run --reviewfile ./reviewfile-relaxed.ts --post
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## GitLab CI

### Basic Setup

Create `.gitlab-ci.yml`:

```yaml
stages:
  - review

code_review:
  stage: review
  image: node:18
  script:
    - npm install
    - npm install -g velvet
    - velvet local
  only:
    - merge_requests
  allow_failure: false
```

### Advanced Setup

With caching and artifacts:

```yaml
stages:
  - install
  - review

install_dependencies:
  stage: install
  image: node:18
  script:
    - npm ci
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

code_review:
  stage: review
  image: node:18
  dependencies:
    - install_dependencies
  script:
    - npm install -g velvet
    - velvet local --base $CI_MERGE_REQUEST_TARGET_BRANCH_NAME --verbose
  only:
    - merge_requests
  artifacts:
    reports:
      codequality: review-report.json
    when: always
```

### With Different Rules per Branch

```yaml
.review_template:
  stage: review
  image: node:18
  script:
    - npm install
    - npm install -g velvet
    - velvet local --reviewfile $REVIEWFILE --verbose
  only:
    - merge_requests

review_main:
  extends: .review_template
  variables:
    REVIEWFILE: "./reviewfile-strict.ts"
  only:
    refs:
      - merge_requests
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"

review_develop:
  extends: .review_template
  variables:
    REVIEWFILE: "./reviewfile-relaxed.ts"
  only:
    refs:
      - merge_requests
    variables:
      - $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "develop"
```

## CircleCI

### Basic Setup

Create `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  code-review:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - npm-deps-{{ checksum "package-lock.json" }}
      - run:
          name: Install dependencies
          command: npm install
      - save_cache:
          key: npm-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
      - run:
          name: Run code review
          command: npx velvet local

workflows:
  review:
    jobs:
      - code-review:
          filters:
            branches:
              ignore: main
```

### Advanced Setup

With parallel execution and GitHub integration:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.0

jobs:
  code-review:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Install velvet
          command: npm install -g velvet
      - run:
          name: Run code review
          command: |
            if [ -n "$CIRCLE_PULL_REQUEST" ]; then
              PR_NUMBER=$(echo $CIRCLE_PULL_REQUEST | grep -o '[0-9]*$')
              velvet run --owner $CIRCLE_PROJECT_USERNAME --repo $CIRCLE_PROJECT_REPONAME --pr $PR_NUMBER
            else
              velvet local
            fi
          environment:
            GITHUB_TOKEN: $GITHUB_TOKEN
      - store_artifacts:
          path: review-results.json
          destination: review-results

workflows:
  version: 2
  review-pr:
    jobs:
      - code-review:
          context: github-credentials
          filters:
            branches:
              ignore: main
```

## Jenkins

### Pipeline Setup

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    environment {
        GITHUB_TOKEN = credentials('github-token')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Code Review') {
            when {
                changeRequest()
            }
            steps {
                sh 'npm install -g velvet'
                sh 'velvet local --base ${CHANGE_TARGET}'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'review-results.json', allowEmptyArchive: true
        }
        failure {
            echo 'Code review failed'
        }
    }
}
```

### Declarative Pipeline with GitHub Integration

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }

    environment {
        GITHUB_TOKEN = credentials('github-token')
        HOME = "${WORKSPACE}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 10, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npm install -g velvet'
            }
        }

        stage('Review') {
            when {
                changeRequest()
            }
            steps {
                script {
                    def prNumber = env.CHANGE_ID
                    def repoOwner = env.CHANGE_FORK ?: env.GIT_URL.tokenize('/')[3]
                    def repoName = env.GIT_URL.tokenize('/')[4].replace('.git', '')

                    sh """
                        velvet run \\
                            --owner ${repoOwner} \\
                            --repo ${repoName} \\
                            --pr ${prNumber} \\
                            --post
                    """
                }
            }
        }

        stage('Local Review') {
            when {
                not {
                    changeRequest()
                }
            }
            steps {
                sh 'velvet local'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '**/review-*.json', allowEmptyArchive: true
        }
        failure {
            emailext(
                subject: "Code Review Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Check console output at ${env.BUILD_URL}",
                recipientProviders: [developers(), requestor()]
            )
        }
    }
}
```

## Bitbucket Pipelines

### Basic Setup

Create `bitbucket-pipelines.yml`:

```yaml
image: node:18

pipelines:
  pull-requests:
    '**':
      - step:
          name: Code Review
          caches:
            - node
          script:
            - npm install
            - npm install -g velvet
            - velvet local --base $BITBUCKET_PR_DESTINATION_BRANCH
```

### Advanced Setup

```yaml
image: node:18

definitions:
  caches:
    npm: $HOME/.npm

  steps:
    - step: &install
        name: Install Dependencies
        caches:
          - node
          - npm
        script:
          - npm ci
        artifacts:
          - node_modules/**

    - step: &review
        name: Code Review
        script:
          - npm install -g velvet
          - |
            if [ "$BITBUCKET_PR_ID" ]; then
              velvet local --base $BITBUCKET_PR_DESTINATION_BRANCH --verbose
            else
              velvet local --verbose
            fi
        artifacts:
          - review-results.json

pipelines:
  pull-requests:
    '**':
      - step: *install
      - step: *review

  branches:
    develop:
      - step: *install
      - step:
          <<: *review
          name: Quick Review
```

## Azure Pipelines

### Basic Setup

Create `azure-pipelines.yml`:

```yaml
trigger:
  - main
  - develop

pr:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      npm install
      npm install -g velvet
    displayName: 'Install dependencies'

  - script: |
      velvet local --base $(System.PullRequest.TargetBranch)
    displayName: 'Run code review'
    condition: eq(variables['Build.Reason'], 'PullRequest')
```

### Advanced Setup

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - feature/*

pr:
  branches:
    include:
      - main
      - develop

variables:
  - group: github-credentials

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Review
    displayName: 'Code Review'
    jobs:
      - job: ReviewJob
        displayName: 'Run Review'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'

          - task: Cache@2
            inputs:
              key: 'npm | "$(Agent.OS)" | package-lock.json'
              path: $(npm config get cache)
            displayName: 'Cache npm'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm install -g velvet
            displayName: 'Install velvet'

          - script: |
              if [ "$(Build.Reason)" = "PullRequest" ]; then
                velvet local --base $(System.PullRequest.TargetBranch) --verbose
              else
                velvet local --verbose
              fi
            displayName: 'Run code review'
            env:
              GITHUB_TOKEN: $(GITHUB_TOKEN)

          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: 'review-results.json'
              artifactName: 'review-results'
            condition: always()
```

## Travis CI

### Basic Setup

Create `.travis.yml`:

```yaml
language: node_js
node_js:
  - '18'

cache:
  directories:
    - node_modules

install:
  - npm install
  - npm install -g velvet

script:
  - velvet local

branches:
  only:
    - main
    - develop
```

### Advanced Setup

```yaml
language: node_js
node_js:
  - '18'
  - '20'

cache:
  npm: true

install:
  - npm ci
  - npm install -g velvet

script:
  - npm test
  - |
    if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
      velvet local --base $TRAVIS_BRANCH --verbose
    else
      velvet local --verbose
    fi

after_success:
  - echo "Code review passed!"

after_failure:
  - echo "Code review failed!"

notifications:
  email:
    on_success: change
    on_failure: always
```

## Pre-commit Hooks

### Using Husky

Install Husky:

```bash
npm install --save-dev husky
npx husky install
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run code review on staged changes
npx velvet local --verbose
```

Make it executable:

```bash
chmod +x .husky/pre-commit
```

### Using Git Hooks (without Husky)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running code review..."
npx velvet local

if [ $? -ne 0 ]; then
  echo "Code review failed. Commit aborted."
  exit 1
fi

echo "Code review passed!"
exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

### Pre-push Hook

Create `.husky/pre-push`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run more thorough review before push
npx velvet local --verbose

if [ $? -ne 0 ]; then
  echo "❌ Code review failed. Push aborted."
  echo "Fix the issues or use --no-verify to skip this check."
  exit 1
fi

echo "✅ Code review passed!"
```

## Best Practices

### 1. Fetch Full Git History

Always fetch complete history to analyze all changes:

```yaml
# GitHub Actions
- uses: actions/checkout@v3
  with:
    fetch-depth: 0  # Important!

# GitLab CI
before_script:
  - git fetch --unshallow || true

# CircleCI
- run: |
    git fetch origin +refs/heads/*:refs/remotes/origin/*
```

### 2. Cache Dependencies

Speed up builds by caching node_modules:

```yaml
# GitHub Actions
- uses: actions/setup-node@v3
  with:
    cache: 'npm'

# GitLab CI
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

# CircleCI
- restore_cache:
    keys:
      - npm-deps-{{ checksum "package-lock.json" }}
```

### 3. Use Different Rules for Different Branches

```yaml
# Strict for main, relaxed for others
- run: |
    if [ "$BRANCH" = "main" ]; then
      velvet local --reviewfile ./reviewfile-strict.ts
    else
      velvet local --reviewfile ./reviewfile-relaxed.ts
    fi
```

### 4. Set Proper Exit Codes

Ensure CI fails when review fails:

```bash
# This will exit with code 1 if review fails
velvet local

# Capture exit code
velvet local
EXIT_CODE=$?
echo "Review exit code: $EXIT_CODE"
exit $EXIT_CODE
```

### 5. Store Artifacts

Save review results for later analysis:

```yaml
# GitHub Actions
- uses: actions/upload-artifact@v3
  with:
    name: review-results
    path: review-results.json

# GitLab CI
artifacts:
  paths:
    - review-results.json
  when: always
```

## Troubleshooting

### "fatal: not a git repository"

Ensure git history is fetched:

```yaml
# Add this to your checkout step
fetch-depth: 0
```

### "Cannot find reviewfile"

Ensure reviewfile.ts is committed:

```bash
git add reviewfile.ts
git commit -m "Add reviewfile"
```

### GitHub Token Issues

Ensure token has correct permissions:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# Or use a personal access token
env:
  GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

### Permission Denied Errors

Make scripts executable:

```bash
chmod +x .husky/pre-commit
chmod +x scripts/review.sh
```

### Review Passes Locally but Fails in CI

Check base branch:

```bash
# Local
velvet local --base main

# CI - ensure same base branch
velvet local --base $CI_BASE_BRANCH
```

## Environment Variables

Common environment variables across platforms:

```bash
# GitHub Actions
GITHUB_TOKEN
GITHUB_REPOSITORY
GITHUB_PR_NUMBER
GITHUB_REF

# GitLab CI
CI_MERGE_REQUEST_TARGET_BRANCH_NAME
CI_MERGE_REQUEST_SOURCE_BRANCH_NAME
GITLAB_USER_LOGIN

# CircleCI
CIRCLE_PULL_REQUEST
CIRCLE_PROJECT_USERNAME
CIRCLE_PROJECT_REPONAME

# Jenkins
CHANGE_ID
CHANGE_TARGET
GIT_URL

# Bitbucket
BITBUCKET_PR_ID
BITBUCKET_PR_DESTINATION_BRANCH
BITBUCKET_REPO_FULL_NAME
```

## Next Steps

- See [writing-rules.md](./writing-rules.md) for rule examples
- Check [examples/](../examples/) for working reviewfiles
- Test locally with `velvet local --verbose`
- Join discussions on GitHub for CI-specific questions

---

Happy reviewing! 🚀
