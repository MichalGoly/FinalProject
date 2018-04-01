#!/bin/sh
echo "Running client unit tests"
cd client
docker build -t clienttest --file Dockerfile.test .
docker run -it clienttest

# Server side unit tests
echo "Running server unit tests"
cd ..
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml build
docker-compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from server_node
