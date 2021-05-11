#! /bin/bash
# $1:input_file $2:output_file
teams=$(awk '{print $1}' $1)
for team1 in $teams; do
    team1=(${team1//,/ })
    team1=${team1[0]}
    for team2 in $teams; do
        team2=(${team2//,/ })
        team2=${team2[0]}
        if [ $team1 != $team2 ]; then
            echo $team1,$team2 >>$2
        fi
    done
done
