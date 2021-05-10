#! /bin/bash
# $1:input_file $2:max_num
contests=$(awk '{print }' $1) # load contests info
cnt=0
for contest in $contests; do
    if [ "$cnt" -lt "$2" ]; then
        teams=(${contest//,/ }) # split by ,
        base_url_0=/data/thuai4/${teams[0]}/player
        base_url_1=/data/thuai4/${teams[1]}/player
        if [ -f $base_url_0/PLAYER1 ] && [ -f $base_url_0/PLAYER2 ] && [ -f $base_url_0/PLAYER3 ] && [ -f $base_url_0/PLAYER4 ] && [ -f $base_url_1/PLAYER1 ] && [ -f $base_url_1/PLAYER2 ] && [ -f $base_url_1/PLAYER3 ] && [ -f $base_url_1/PLAYER4 ]; then

            mkdir /data/thuai4_final/${teams[0]}vs${teams[1]}

            docker network create ${teams[0]}vs${teams[1]}

            docker run --name=THUAI4_final_server_${teams[0]}vs${teams[1]} --network=${teams[0]}vs${teams[1]} -d -v /data/thuai4_final/${teams[0]}vs${teams[1]}:/usr/local/mnt eesast/thuai_server_final:latest 1200 2 4

            ip_address=$(docker inspect THUAI4_final_server_${teams[0]}vs${teams[1]} --format '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

            docker run --name=THUAI4_final_agentclient_${teams[0]}vs${teams[1]} -d -v /data/thuai4/${teams[0]}/player:/usr/local/mnt/player1 -v /data/thuai4/${teams[1]}/player:/usr/local/mnt/player2 --network=${teams[0]}vs${teams[1]} eesast/thuai_agentclient_final:latest $ip_address 1200
        fi

        sed -i '1d' $1

        ((cnt++))
    else
        break
    fi
done
