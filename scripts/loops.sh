#! /bin/bash
# $1:output_file $2:round $3:times
for cnt in $(seq 1 $3); do
    ./calculate_score_bonus.sh $1 $2
done
