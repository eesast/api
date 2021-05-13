#! /bin/bash
# $1:teams_list $2:round
files=$(ls /data/thuai4_final/round$2)
for lines in $files; do
    if [ -f /data/thuai4_final/round$2/$lines/score ]; then
        content=$(awk '{print }' /data/thuai4_final/round$2/$lines/score)
        result=(${content//,/ })
        if [ ! ${result[0]} ]; then
            result[0]=0
        fi
        if [ ! ${result[1]} ]; then
            result[1]=0
        fi

        teams=(${lines//_vs_/ })
        cnt=0
        for team in ${teams[@]}; do
            a=$(sed -n /$team/p $1)
            if [ ! "$a" ]; then
                continue 2
            fi
            a=$(echo $a | sed 's/ //g') # 去掉空格
            tmp=(${a//,/ })
            if [ ! ${tmp[2]} ]; then
                tmp[2]=0
            fi
            score=$(expr ${tmp[2]} + ${result[$cnt]})
            sed -i "s/$team.*/$team,${tmp[1]},${score}/" $1
            ((cnt++))
        done
    fi
done
