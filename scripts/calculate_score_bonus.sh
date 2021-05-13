#! /bin/bash
# $1:teams_list
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
            tmp=$(sed -n /$team/p $1)
            if [ ! "$tmp" ]; then
                continue 2
            fi
            tmp=$(echo $tmp | sed 's/ //g') # 去掉空格
            tmp=(${tmp//,/ })
            team_name[$cnt]=${tmp[1]}
            if [ ! ${tmp[2]} ]; then
                a[$cnt]=0
            else
                a[$cnt]=${tmp[2]} # a:原始分数
            fi
            # score=$(expr ${tmp[2]} + ${result[$cnt]})
            # sed -i "s/$team.*/$team,${tmp[1]},${score}/" $1
            ((cnt++))
        done
        cnt=0
        for team in ${teams[@]}; do
            score=$(/home/ubuntu/final/cppscore ${a[0]} ${a[1]} ${result[0]} ${result[1]} $cnt)
            sed -i "s/$team.*/$team,${team_name[$cnt]},${score}/" $1
            ((cnt++))
        done
    fi
done
