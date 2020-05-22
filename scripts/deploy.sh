echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker build -t eesast/api:latest .
docker push eesast/api:latest
