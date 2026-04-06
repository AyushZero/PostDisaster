pipeline {
    agent any

    parameters {
        choice(name: 'DEPLOY_SCOPE', choices: ['dev', 'staging', 'prod', 'all'], description: 'Where to deploy after CI passes')
        booleanParam(name: 'APPLY_INFRA', defaultValue: false, description: 'Run terraform apply (false = plan only)')
        booleanParam(name: 'STRICT_LINT', defaultValue: false, description: 'Fail the build if lint reports errors')
        booleanParam(name: 'DEPLOY_MONITORING', defaultValue: true, description: 'Deploy Prometheus, Grafana, Alertmanager, and exporters')
        booleanParam(name: 'ROLLBACK_DEPLOY', defaultValue: false, description: 'Deploy rollback tag instead of current build')
        string(name: 'ROLLBACK_TAG', defaultValue: '', description: 'Required when ROLLBACK_DEPLOY is true')
    }

    environment {
        APP_NAME = 'post-disaster-alert'
        DOCKERHUB_NAMESPACE = 'ayushzero'
        NEXT_PUBLIC_SUPABASE_URL = credentials('SUPABASE_URL')
        NEXT_PUBLIC_SUPABASE_ANON_KEY = credentials('SUPABASE_ANON_KEY')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'chmod +x scripts/jenkins/*.sh'
            }
        }

        stage('Validate Toolchain') {
            steps {
                sh 'bash scripts/jenkins/validate_stack.sh'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint and Build') {
            steps {
                script {
                    if (params.STRICT_LINT) {
                        sh 'npm run lint'
                    } else {
                        sh 'npm run lint || true'
                        echo 'Lint issues found but ignored because STRICT_LINT=false'
                    }
                }
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def shortSha = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
                    env.APP_IMAGE_TAG = "${BUILD_NUMBER}-${shortSha}"
                    env.DOCKER_IMAGE_REPOSITORY = "${env.DOCKERHUB_NAMESPACE}/${env.APP_NAME}"
                }

                sh '''
                    docker build \
                        --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
                        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
                        -t ${DOCKER_IMAGE_REPOSITORY}:${APP_IMAGE_TAG} .
                    docker tag ${DOCKER_IMAGE_REPOSITORY}:${APP_IMAGE_TAG} ${DOCKER_IMAGE_REPOSITORY}:latest
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'DOCKERHUB_CREDENTIALS', passwordVariable: 'DOCKER_REGISTRY_PASSWORD', usernameVariable: 'DOCKER_REGISTRY_USERNAME')]) {
                    sh '''
                        echo "${DOCKER_REGISTRY_PASSWORD}" | docker login -u "${DOCKER_REGISTRY_USERNAME}" --password-stdin
                        docker push ${DOCKER_IMAGE_REPOSITORY}:${APP_IMAGE_TAG}
                        docker push ${DOCKER_IMAGE_REPOSITORY}:latest
                    '''
                }
            }
        }

        stage('Terraform and Ansible Deploy') {
            steps {
                script {
                    def targets = []
                    if (params.DEPLOY_SCOPE == 'all') {
                        targets = ['dev', 'staging', 'prod']
                    } else {
                        targets = [params.DEPLOY_SCOPE]
                    }

                    for (target in targets) {
                        if (target == 'prod') {
                            input message: 'Approve deployment to prod?', ok: 'Deploy prod'
                        }

                        sh "bash scripts/jenkins/tf_plan_apply.sh ${target} ${params.APPLY_INFRA}"

                        if (!params.APPLY_INFRA) {
                            echo "Skipping terraform apply for ${target} because APPLY_INFRA=false; continuing with Ansible deploy on existing infrastructure"
                        }

                        withCredentials([
                            sshUserPrivateKey(credentialsId: 'EC2_SSH_KEY', keyFileVariable: 'SSH_PRIVATE_KEY_FILE', usernameVariable: 'SSH_REMOTE_USER'),
                            usernamePassword(credentialsId: 'DOCKERHUB_CREDENTIALS', passwordVariable: 'DOCKER_REGISTRY_PASSWORD', usernameVariable: 'DOCKER_REGISTRY_USERNAME')
                        ]) {
                            env.DEPLOY_ENVIRONMENT = target

                            sh "bash scripts/jenkins/ansible_deploy.sh ${target} ${APP_IMAGE_TAG} provision"

                            if (params.ROLLBACK_DEPLOY) {
                                if (!params.ROLLBACK_TAG?.trim()) {
                                    error('ROLLBACK_TAG is required when ROLLBACK_DEPLOY=true')
                                }
                                sh "bash scripts/jenkins/ansible_deploy.sh ${target} ${APP_IMAGE_TAG} rollback ${params.ROLLBACK_TAG}"
                            } else {
                                sh "bash scripts/jenkins/ansible_deploy.sh ${target} ${APP_IMAGE_TAG} deploy"
                            }
                        }

                        if (params.DEPLOY_MONITORING) {
                            withCredentials([
                                sshUserPrivateKey(credentialsId: 'EC2_SSH_KEY', keyFileVariable: 'SSH_PRIVATE_KEY_FILE', usernameVariable: 'SSH_REMOTE_USER'),
                                string(credentialsId: 'SLACK_ALERT_WEBHOOK', variable: 'SLACK_WEBHOOK_URL')
                            ]) {
                                env.DEPLOY_ENVIRONMENT = target
                                sh "bash scripts/jenkins/ansible_deploy.sh ${target} ${APP_IMAGE_TAG} monitoring"
                            }
                        }

                        def hostIp = sh(script: "cd terraform/environments/${target} && terraform output -raw app_public_ip", returnStdout: true).trim()
                        sh "curl -fsS http://${hostIp}:3000/api/health"
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Build ${BUILD_NUMBER} completed. Image: ${DOCKER_IMAGE_REPOSITORY}:${APP_IMAGE_TAG}"
        }
        failure {
            echo 'Pipeline failed. Check terraform/ansible/docker logs in this build.'
        }
        always {
            script {
                try {
                    sh 'docker image prune -f || true'
                } catch (err) {
                    echo "Skipping docker prune because workspace/agent context is unavailable: ${err}"
                }

                try {
                    archiveArtifacts artifacts: 'terraform/environments/**/tfplan, ansible/inventories/**/hosts.generated.yml', allowEmptyArchive: true
                } catch (err) {
                    echo "Skipping artifact archive because workspace/agent context is unavailable: ${err}"
                }
            }
        }
    }
}
