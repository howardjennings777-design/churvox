from pathlib import Path

DOCKER = Path('Dockerfile')
BACKEND_PROCFILE = Path('backend/Procfile')
ROOT_PROCFILE = Path('Procfile')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


docker = DOCKER.read_text(encoding='utf-8')
docker = replace_once(
    docker,
    'CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]',
    'CMD ["uvicorn", "churvox_boot:app", "--host", "0.0.0.0", "--port", "8080"]',
    'Docker backend app',
)
DOCKER.write_text(docker, encoding='utf-8')

backend_procfile = BACKEND_PROCFILE.read_text(encoding='utf-8')
backend_procfile = replace_once(
    backend_procfile,
    'web: uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --lifespan off',
    'web: uvicorn churvox_boot:app --host 0.0.0.0 --port ${PORT:-8080}',
    'backend Procfile app',
)
BACKEND_PROCFILE.write_text(backend_procfile, encoding='utf-8')

root_procfile = ROOT_PROCFILE.read_text(encoding='utf-8')
if 'uvicorn churvox_boot:app' not in root_procfile:
    raise RuntimeError('root Procfile is not using churvox_boot:app')

print('Aligned every Render backend entrypoint to churvox_boot:app with lifespan enabled.')
