echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker build -t yingrui205/sast-api:$TRAVIS_TAG -t yingrui205/sast-api:latest .
docker push yingrui205/sast-api:$TRAVIS_TAG
docker push yingrui205/sast-api:latest
