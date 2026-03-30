# Post Disaster Alert System

A real-time disaster alert and information system for India, covering earthquakes and floods. Built with Next.js, Supabase, and deployed on Vercel.

## Features

### For Users
- View active disasters in your area
- Real-time alerts and notifications
- Interactive map showing affected areas, shelters, hospitals, and more
- Emergency contact numbers
- Location-based disaster information

### For Admins
- Create and manage disasters
- Upload disaster data via CSV or manual entry
- Draw affected areas on map
- Mark infrastructure points (shelters, hospitals, NGOs, closed roads)
- Issue emergency alerts
- Manage emergency contact numbers

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Maps**: Leaflet.js with OpenStreetMap
- **Deployment**: Vercel / AWS EC2
- **CI/CD**: Jenkins, Docker, Terraform, Ansible

## Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free)
- A Vercel account (free, for deployment)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Fill in your Supabase credentials in `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Setup

For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

## Jenkins CI/CD (AWS Free Tier)

For full setup instructions, see [JENKINS_SETUP.md](./JENKINS_SETUP.md).

The implemented pipeline now includes:
- CI checks (`npm ci`, lint, build)
- Docker image build and push to Docker Hub
- Terraform plan/apply per environment (`dev`, `staging`, `prod`)
- Ansible provisioning and deployment
- Health verification using `/api/health`
- Rollback option using a specific image tag

### CI/CD Quick Commands

Local validation:

```bash
npm ci
npm run lint
npm run build
docker build -t post-disaster-alert:local .
```

Terraform (example for dev):

```bash
cd terraform/environments/dev
terraform init
terraform validate
terraform plan
```

Ansible syntax checks:

```bash
ansible-playbook -i ansible/inventories/dev/hosts.yml ansible/playbooks/provision.yml --syntax-check
ansible-playbook -i ansible/inventories/dev/hosts.yml ansible/playbooks/deploy.yml --syntax-check
```

## Project Structure

```
post-disaster-alert/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── user/           # User dashboard pages
│   │   ├── auth/           # Login/Register pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── map/           # Map-related components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript type definitions
├── supabase/
│   └── schema.sql         # Database schema
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
├── jenkins/
│   ├── install-jenkins.sh # EC2 setup script
│   └── .env.example       # Environment template
├── terraform/             # AWS infrastructure as code
├── ansible/               # Provisioning and deployment playbooks
├── scripts/
│   └── jenkins/           # Jenkins helper scripts (terraform + ansible)
├── Jenkinsfile            # CI/CD Pipeline definition
├── Dockerfile             # Docker configuration
└── docker-compose.yml     # Docker Compose for local dev
```

## CSV Upload Format

```csv
area_name,severity,description
Mumbai City,high,Heavy flooding in low-lying areas
Thane District,medium,Moderate water logging
```

## Emergency Numbers (Pre-populated)

| Service | Number |
|---------|--------|
| National Emergency | 112 |
| Ambulance | 108 |
| Police | 100 |
| Fire | 101 |
| Disaster Management | 1078 |

## License

MIT
