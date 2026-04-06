pipeline {
    agent any

    triggers {
        githubPush()
    }

    parameters {
        choice(name: 'DEPLOY_SCOPE', choices: ['dev', 'staging', 'prod', 'all'], description: 'Where to deploy after CI passes')
        booleanParam(name: 'APPLY_INFRA', defaultValue: false, description: 'Run terraform apply (false = plan only)')
        booleanParam(name: 'STRICT_LINT', defaultValue: false, description: 'Fail the build if lint reports errors')
        booleanParam(name: 'ROLLBACK_DEPLOY', defaultValue: false, description: 'Deploy rollback tag instead of current build')
        string(name: 'ROLLBACK_TAG', defaultValue: '', description: 'Required when ROLLBACK_DEPLOY is true')
        booleanParam(name: 'RUN_ZAP_SCAN', defaultValue: true, description: 'Run OWASP ZAP DAST scan after deploy')
        booleanParam(name: 'DEPLOY_K8S', defaultValue: true, description: 'Run Kubernetes blue-green deployment')
    }

    environment {
        APP_NAME = 'post-disaster-alert'
        DOCKERHUB_NAMESPACE = 'ayushzero'
        NEXT_PUBLIC_SUPABASE_URL = credentials('SUPABASE_URL')
        NEXT_PUBLIC_SUPABASE_ANON_KEY = credentials('SUPABASE_ANON_KEY')
    }

    stages {
        // ---------------------------------------------------------------
        // CI Stages — Automatic on every push
        // ---------------------------------------------------------------
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

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool name: 'SonarQubeScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectKey=${APP_NAME} \
                                -Dsonar.sources=src \
                                -Dsonar.host.url=\${SONAR_HOST_URL} \
                                -Dsonar.login=\${SONAR_AUTH_TOKEN}
                        """
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        // ---------------------------------------------------------------
        // Docker Build + Push
        // ---------------------------------------------------------------
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

        // ---------------------------------------------------------------
        // CD — Terraform + Ansible (existing EC2 infra)
        // ---------------------------------------------------------------
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

                        def hostIp = sh(script: "cd terraform/environments/${target} && terraform output -raw app_public_ip", returnStdout: true).trim()
                        sh "curl -fsS http://${hostIp}:3000/api/health"
                    }
                }
            }
        }

        // ---------------------------------------------------------------
        // CD — Kubernetes Blue-Green Deployment
        // ---------------------------------------------------------------
        stage('K8s Blue-Green Deploy') {
            when {
                expression { return params.DEPLOY_K8S }
            }
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
                            input message: 'Approve K8s blue-green deployment to prod?', ok: 'Deploy prod'
                        }

                        withCredentials([file(credentialsId: 'KUBECONFIG', variable: 'KUBECONFIG')]) {
                            if (params.ROLLBACK_DEPLOY) {
                                echo "Rolling back K8s deployment for ${target}..."
                                sh "bash scripts/jenkins/k8s_deploy.sh ${target} ${APP_IMAGE_TAG} rollback"
                            } else {
                                echo "Deploying to K8s (${target}) with blue-green strategy..."
                                sh "bash scripts/jenkins/k8s_deploy.sh ${target} ${APP_IMAGE_TAG}"
                            }
                        }
                    }
                }
            }
        }

        // ---------------------------------------------------------------
        // Security — OWASP ZAP DAST
        // ---------------------------------------------------------------
        stage('OWASP ZAP DAST') {
            when {
                expression { return params.RUN_ZAP_SCAN }
            }
            steps {
                script {
                    def targets = []
                    if (params.DEPLOY_SCOPE == 'all') {
                        targets = ['dev', 'staging', 'prod']
                    } else {
                        targets = [params.DEPLOY_SCOPE]
                    }

                    for (target in targets) {
                        def hostIp = sh(script: "cd terraform/environments/${target} && terraform output -raw app_public_ip", returnStdout: true).trim()
                        def targetUrl = "http://${hostIp}:3000"
                        echo "Running OWASP ZAP baseline scan against ${targetUrl} (${target})"

                        sh "bash scripts/jenkins/owasp_zap.sh ${targetUrl} ${WORKSPACE} || true"
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
            echo 'Pipeline failed. Check terraform/ansible/docker/sonar/zap/k8s logs in this build.'
        }
        always {
            script {
                try {
                    sh 'docker image prune -f || true'
                } catch (err) {
                    echo "Skipping docker prune because workspace/agent context is unavailable: ${err}"
                }

                try {
                    archiveArtifacts artifacts: 'terraform/environments/**/tfplan, ansible/inventories/**/hosts.generated.yml, zap-report.html', allowEmptyArchive: true
                } catch (err) {
                    echo "Skipping artifact archive because workspace/agent context is unavailable: ${err}"
                }
            }
        }
    }
}
