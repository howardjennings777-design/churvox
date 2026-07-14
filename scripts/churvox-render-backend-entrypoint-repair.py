from pathlib import Path

DOCKER = Path('Dockerfile')
BACKEND_PROCFILE = Path('backend/Procfile')
ROOT_PROCFILE = Path('Procfile')
TARGET = 'server:app'


def promote(text: str) -> str:
    return (
        text
        .replace('churvox_outreach_boot:app', TARGET)
        .replace('churvox_boot:app', TARGET)
    )


docker = promote(DOCKER.read_text(encoding='utf-8'))
backend_procfile = promote(BACKEND_PROCFILE.read_text(encoding='utf-8'))
root_procfile = promote(ROOT_PROCFILE.read_text(encoding='utf-8'))

if '"server:app"' not in docker:
    raise RuntimeError('Dockerfile is not using the production server wrapper')
if f'uvicorn {TARGET}' not in backend_procfile:
    raise RuntimeError('backend Procfile is not using the production server wrapper')
if f'uvicorn {TARGET}' not in root_procfile:
    raise RuntimeError('root Procfile is not using the production server wrapper')
if '--lifespan off' in backend_procfile:
    backend_procfile = backend_procfile.replace(' --lifespan off', '')

DOCKER.write_text(docker, encoding='utf-8')
BACKEND_PROCFILE.write_text(backend_procfile, encoding='utf-8')
ROOT_PROCFILE.write_text(root_procfile, encoding='utf-8')

print('Aligned every Render backend entrypoint to server:app, the live backend/server/__init__.py wrapper.')
